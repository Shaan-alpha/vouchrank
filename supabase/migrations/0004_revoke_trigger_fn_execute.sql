-- handle_new_user is a trigger-only function. Supabase grants EXECUTE to anon /
-- authenticated explicitly (not via PUBLIC), so revoke those directly. The
-- AFTER INSERT trigger on auth.users still fires regardless of these grants.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- NOTE: user_agency_ids() and has_agency_role() intentionally keep EXECUTE for
-- `authenticated` — RLS policy evaluation requires it, and they only return the
-- calling user's own membership. This is the standard function-based RLS pattern.
