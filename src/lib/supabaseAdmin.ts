import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client — uses Service Role Key to bypass RLS.
 * ⚠️ ONLY use in server-side code (Server Actions / API Routes).
 * NEVER expose this client to the browser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
