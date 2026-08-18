import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl: string = process.env.SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.warn(
    'Warning: Supabase keys are missing from server/.env file. Please check configuration.'
  );
}

// Client for standard auth requests (e.g. signing in users)
const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Admin client for database queries that bypass RLS (e.g. fetching user profile details)
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export {
  supabaseClient,
  supabaseAdmin
};
