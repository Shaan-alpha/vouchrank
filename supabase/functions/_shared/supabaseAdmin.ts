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

// Map a user to one of their agencies. Owners first, then admins, then members
// (member_role enum order), so a multi-agency user resolves deterministically
// to their highest-privilege membership. Real apps pass agency_id explicitly.
export async function getAgencyForUser(userId: string) {
  const { data } = await supabaseAdmin
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', userId)
    .order('role', { ascending: true })        // enum order: owner < admin < member
    .order('created_at', { ascending: true })  // deterministic tie-break among same-role memberships
    .limit(1)
    .maybeSingle();
  return data;
}

// Resolve who is calling a service-style function. Either a trusted internal
// caller (cron/scheduled jobs presenting FUNCTION_INTERNAL_SECRET) or a signed-in
// user mapped to their agency. Functions then check the target location belongs
// to that agency. Prevents anyone holding the public key from invoking these.
export async function getCaller(req: Request): Promise<{
  internal: boolean;
  member: { agency_id: string; role: string } | null;
}> {
  const expected = Deno.env.get('FUNCTION_INTERNAL_SECRET');
  const presented = req.headers.get('x-internal-secret');
  if (expected && presented && presented === expected) return { internal: true, member: null };
  const user = await getUser(req);
  if (!user) return { internal: false, member: null };
  const member = await getAgencyForUser(user.id);
  return { internal: false, member };
}
