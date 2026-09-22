import { z } from 'zod';

const BlockTypeSchema = z.enum([
  'text',
  'script',
  'vault',
  'link',
  'image',
  'whiteboard',
  'drawio',
  'excalidraw'
]);

export const DrawingElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  text: z.string().optional(),
  strokeColor: z.string().optional(),
  fillColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  fontSize: z.number().optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  rounded: z.boolean().optional(),
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional()
});

export const CanvasBlockSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.union([z.number(), z.string()]),
  height: z.union([z.number(), z.string()]),
  type: BlockTypeSchema.optional(),
  
  content: z.string().optional(),
  
  title: z.string().optional(),
  description: z.string().optional(),
  targetPurpose: z.string().optional(),
  language: z.string().optional(),
  filename: z.string().optional(),
  code: z.string().optional(),
  wrapLines: z.boolean().optional(),
  theme: z.enum(['dark', 'light']).optional(),
  viewMode: z.enum(['edit', 'preview']).optional(),
  showDescription: z.boolean().optional(),
  
  vaultTitle: z.string().optional(),
  secrets: z.array(z.any()).optional(),
  
  linkId: z.string().optional(),
  linkTitle: z.string().optional(),
  linkUrl: z.string().optional(),
  linkCategory: z.string().optional(),
  linkSubcategory: z.string().optional(),
  linkDescription: z.string().optional(),
  linkImageUrl: z.string().nullable().optional(),
  
  imageUrl: z.string().optional(),
  imageTitle: z.string().optional(),
  imageCaption: z.string().optional(),
  imageNotes: z.string().optional(),
  capturedAt: z.string().optional(),
  
  drawingTitle: z.string().optional(),
  elements: z.array(DrawingElementSchema).optional(),
  canvasBg: z.enum(['grid', 'dots', 'blank']).optional()
});

export const CanvasBlocksListSchema = z.array(CanvasBlockSchema);

/**
 * Validates and sanitizes a JSON block list or an array of blocks.
 * If invalid, throws an error or cleans and sanitizes the structure.
 */
export function validateAndSanitizeBlocks(blocksData: unknown): unknown[] {
  if (!blocksData) return [];
  
  let parsed: unknown = blocksData;
  if (typeof blocksData === 'string') {
    try {
      parsed = JSON.parse(blocksData);
    } catch {
      console.error('Failed to parse blocks string inside validator');
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    console.warn('Block data is not an array, returning empty fallback list');
    return [];
  }

  const result = CanvasBlocksListSchema.safeParse(parsed);
  if (result.success) {
    return result.data;
  } else {
    console.warn('Block schema validation warning:', result.error.format());
    // Clean-up fallback: filter out completely invalid objects
    return (parsed as Record<string, unknown>[]).filter(item => {
      return item && typeof item === 'object' && typeof item.id === 'string' && typeof item.x === 'number' && typeof item.y === 'number';
    });
  }
}
