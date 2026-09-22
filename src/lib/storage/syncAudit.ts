import { offlineDb, SyncQueueItem } from '@/lib/db/offlineDb';
import { supabase } from '@/lib/supabase';

const MAX_RETRIES = 5;

export interface AuditReport {
  stuckItems: number;
  duplicatePayloadsRemoved: number;
  orphanedItemsRemoved: number;
  conflictItemsResolved: number;
  totalBefore: number;
  totalAfter: number;
  errors: string[];
}

/**
 * Audits and self-repairs the synchronization queue (syncQueue).
 * 
 * Addresses:
 * 1. Stuck items / infinite retries (limits to MAX_RETRIES, moves to dead-letter state).
 * 2. Duplicate payloads (consolidates multiple rapid edits for the same page).
 * 3. Orphaned records (removes queue items for pages that no longer exist locally).
 * 4. Conflict queue cleanups.
 */
export async function auditAndRepairSyncQueue(): Promise<AuditReport> {
  const report: AuditReport = {
    stuckItems: 0,
    duplicatePayloadsRemoved: 0,
    orphanedItemsRemoved: 0,
    conflictItemsResolved: 0,
    totalBefore: 0,
    totalAfter: 0,
    errors: [],
  };

  try {
    const queue = await offlineDb.syncQueue.toArray();
    report.totalBefore = queue.length;
    if (queue.length === 0) {
      report.totalAfter = 0;
      return report;
    }

    // Map to group operations by pageId to preserve sequential ordering and de-duplicate
    const pageOps: Record<string, SyncQueueItem[]> = {};
    queue.forEach((item) => {
      if (!pageOps[item.pageId]) {
        pageOps[item.pageId] = [];
      }
      pageOps[item.pageId].push(item);
    });

    for (const pageId of Object.keys(pageOps)) {
      const ops = pageOps[pageId];
      const localPage = await offlineDb.pages.get(pageId);

      // --- 1. ORPHAN CHECK ---
      // If there is no local page and the action is NOT a deletion, the queue item is orphaned
      const isOrphaned = !localPage && ops.some(op => op.action !== 'delete');
      if (isOrphaned) {
        for (const op of ops) {
          if (op.id) {
            await offlineDb.syncQueue.delete(op.id);
            report.orphanedItemsRemoved++;
          }
        }
        continue;
      }

      // --- 2. DE-DUPLICATION & CONSOLIDATION ---
      if (ops.length > 1) {
        const hasDelete = ops.some(op => op.action === 'delete');
        if (hasDelete) {
          // If a page is marked for deletion, discard all previous creations or edits
          const deleteOp = ops.find(op => op.action === 'delete')!;
          for (const op of ops) {
            if (op.id !== deleteOp.id && op.id) {
              await offlineDb.syncQueue.delete(op.id);
              report.duplicatePayloadsRemoved++;
            }
          }
          pageOps[pageId] = [deleteOp];
        } else {
          // Keep only the last update because it contains the absolute latest content state
          const lastOp = ops[ops.length - 1];
          for (const op of ops) {
            if (op.id !== lastOp.id && op.id) {
              await offlineDb.syncQueue.delete(op.id);
              report.duplicatePayloadsRemoved++;
            }
          }
          pageOps[pageId] = [lastOp];
        }
      }

      // --- 3. RETRY LIMIT (STUCK ITEMS) & CONFLICT CLEANUP ---
      const activeOps = pageOps[pageId];
      for (const op of activeOps) {
        // If the page is in a conflict state, the queue item is skipped and should be cleaned
        // since conflicts are resolved manually by choosing/overwriting.
        if (localPage && localPage.syncStatus === 'conflict') {
          if (op.id) {
            await offlineDb.syncQueue.delete(op.id);
            report.conflictItemsResolved++;
          }
          continue;
        }

        if (op.attempts >= MAX_RETRIES) {
          report.stuckItems++;
          // If we hit max retries, mark the page status as error/stalled so it's visible in UI
          if (localPage) {
            await offlineDb.pages.update(pageId, {
              syncStatus: 'conflict' // Mark as conflict or stalled for user resolution
            });
          }
          if (op.id) {
            await offlineDb.syncQueue.delete(op.id); // Remove from queue to prevent blocking
          }
          console.warn(`[Sync] Item ${op.id} para a nota ${pageId} atingiu limite máximo de tentativas e foi removido.`);
        }
      }
    }

    const finalQueue = await offlineDb.syncQueue.toArray();
    report.totalAfter = finalQueue.length;

  } catch (err) {
    const msg = (err as Error).message || 'Erro desconhecido';
    report.errors.push(msg);
    console.error('[Sync-Audit] Falha na auditoria da fila de sincronização:', err);
  }

  return report;
}
