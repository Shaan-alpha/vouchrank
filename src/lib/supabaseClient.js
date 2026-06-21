import { createClient } from '@supabase/supabase-js';

// Vite exposes only VITE_-prefixed vars to the browser.
const url = import.meta.env.VITE_SUPABASE_URL;
// Prefer the publishable key (sb_publishable_...). Never ship the service_role key.
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

// When env is absent we run in "demo mode" against mock data (see lib/api.js),
// so the client is only created when real credentials exist.
export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
