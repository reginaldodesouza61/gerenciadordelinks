import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (process.env || {});
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://izwfgwcwqcxihuxwyknr.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2Znd2N3cWN4aWh1eHd5a25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQ5MDUsImV4cCI6MjA3MDE2MDkwNX0.W4daWqQrSxvTPXUS0wPUnuGI7e4ME1QVVtuP913_8bM';

const rawSupabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

function parseStackLine(stackLine: string) {
  if (!stackLine) return { func: 'desconhecida', file: 'desconhecido', line: '0' };
  const clean = stackLine.trim().replace(/^at\s+/, '');
  const matchWithFunc = clean.match(/^(.*?)\s+\((.*?):(\d+):(\d+)\)$/);
  if (matchWithFunc) {
    return { func: matchWithFunc[1], file: matchWithFunc[2], line: matchWithFunc[3] };
  }
  const matchDirect = clean.match(/^(.*?):(\d+):(\d+)$/);
  if (matchDirect) {
    return { func: 'anônima/inline', file: matchDirect[1], line: matchDirect[2] };
  }
  return { func: clean, file: 'desconhecido', line: '0' };
}

export const supabase = rawSupabase;