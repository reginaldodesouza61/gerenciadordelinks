import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = 'https://izwfgwcwqcxihuxwyknr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2Znd2N3cWN4aWh1eHd5a25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQ5MDUsImV4cCI6MjA3MDE2MDkwNX0.W4daWqQrSxvTPXUS0wPUnuGI7e4ME1QVVtuP913_8bM';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});