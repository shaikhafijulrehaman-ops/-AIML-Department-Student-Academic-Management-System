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
 * Real Supabase privileged instance.
 * Explicitly locks Authorization and apikey to the secret key to prevent session mutation.
 */
const realSupabaseAdmin = (supabaseUrl && supabaseSecretKey)
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseSecretKey}`,
          apikey: supabaseSecretKey
        }
      }
    })
  : null;

// Isolated mock state for unit & integration testing
let adminOverride = null;

/**
 * Factory for creating ephemeral, isolated clients for password verification and session refresh.
 * Uses dedicated anon/publishable key and non-persistent session configuration.
 * Prevents user signInWithPassword calls from mutating the privileged admin client session.
 */
export function createAuthClient() {
  if (adminOverride) {
    return adminOverride;
  }
  const url = ENV.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = ENV.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ENV.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Registers an isolated mock for the admin client in test environments.
 * @param {object} mock 
 */
export function setSupabaseAdminMock(mock) {
  adminOverride = mock;
}

/**
 * Resets the test mock override back to the environment client.
 */
export function resetSupabaseAdminMock() {
  adminOverride = null;
}

/**
 * Explicit readiness check for the privileged Supabase Admin client.
 * Replaces unreliable Proxy truthiness checks.
 *
 * @returns {boolean} True if client is initialized and ready for queries.
 */
export function isSupabaseAdminReady() {
  return Boolean(adminOverride || realSupabaseAdmin);
}

/**
 * Privileged Supabase Admin Client for Express backend operations.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. This client operates with service_role permissions and BYPASSES Row Level Security (RLS).
 * 2. It must be strictly reserved for privileged, server-side background and administrative tasks.
 * 3. Never export this module to frontend code.
 * 4. Never log credentials, session keys, or plaintext passwords.
 */
export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    if (prop === 'isReady') {
      return isSupabaseAdminReady();
    }
    const active = adminOverride || realSupabaseAdmin;
    if (!active) {
      return undefined;
    }
    const val = active[prop];
    return typeof val === 'function' ? val.bind(active) : val;
  }
});

export default supabaseAdmin;