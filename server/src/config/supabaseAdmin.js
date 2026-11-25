import { createClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

const supabaseUrl = ENV.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseSecretKey = ENV.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn(
    '[SupabaseAdmin] Notice: SUPABASE_URL or SUPABASE_SECRET_KEY is not fully configured in server environment. Privileged admin client operations will remain unavailable until SUPABASE_SECRET_KEY is provided.'
  );
}

/**
 * Privileged Supabase Admin Client for Express backend operations.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. This client operates with service_role permissions and BYPASSES Row Level Security (RLS).
 * 2. It must be strictly reserved for privileged, server-side background and administrative tasks.
 * 3. Never use this client for ordinary student requests.
 * 4. Never export this module to frontend code.
 * 5. Never log credentials or tokens.
 */
export const supabaseAdmin = (supabaseUrl && supabaseSecretKey)
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export default supabaseAdmin;
