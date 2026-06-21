import { createClient } from 'jsr:@supabase/supabase-js@2';

// Service-role client for Edge Functions. Bypasses RLS — use only server-side.
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// Resolve the caller's user from the Authorization bearer token.
export async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user;
}

// Map a user to the agency they own/admin (first match). Real apps pass agency_id explicitly.
export async function getAgencyForUser(userId: string) {
  const { data } = await supabaseAdmin
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', userId)
    .order('role')
    .limit(1)
    .maybeSingle();
  return data;
}
