import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuration warning: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are missing. Please verify your client/.env.local configuration.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
