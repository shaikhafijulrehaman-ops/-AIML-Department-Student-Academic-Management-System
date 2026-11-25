import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[SupabaseClient] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined in client environment.'
  );
}

/**
 * Reusable Supabase client for React frontend operations.
 * Operates in the authenticated context of the current user respecting Row Level Security (RLS).
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export default supabase;
