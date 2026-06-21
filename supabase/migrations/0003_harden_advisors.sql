-- Hardening pass based on Supabase advisors.

-- 1) Public storage bucket: a SELECT policy on storage.objects lets clients LIST
--    every file. Public buckets already serve objects by URL without it, so drop it.
drop policy if exists "review_videos_public_read" on storage.objects;

-- 2) Remove redundant SELECT policies. Each tenant table had both a *_select
--    (FOR SELECT) and a *_write (FOR ALL) policy → two permissive policies ran on
--    every SELECT. The FOR ALL policy's USING already covers SELECT with an
--    equivalent membership check, so the dedicated *_select policies are dropped.
drop policy if exists locations_select   on locations;
drop policy if exists reviews_select     on reviews;
drop policy if exists audits_select      on aio_audits;
drop policy if exists queries_select     on aio_queries;
drop policy if exists checklist_select   on aio_checklist;
drop policy if exists competitors_select on competitors;
drop policy if exists campaigns_select   on campaigns;

-- 3) agency_members: members must still SELECT the roster (any member), but only
--    admins may modify it. Split the FOR ALL write policy into per-action policies
--    so SELECT is covered by exactly one policy (members_select).
drop policy if exists members_write on agency_members;
create policy members_insert on agency_members for insert to authenticated
  with check ( public.has_agency_role(agency_id, 'admin') );
create policy members_update on agency_members for update to authenticated
  using ( public.has_agency_role(agency_id, 'admin') )
  with check ( public.has_agency_role(agency_id, 'admin') );
create policy members_delete on agency_members for delete to authenticated
  using ( public.has_agency_role(agency_id, 'admin') );

-- 4) Lock down SECURITY DEFINER helpers. RLS evaluation needs `authenticated` to
--    execute the membership helpers, but `anon` never should. handle_new_user is
--    trigger-only and needs no direct EXECUTE at all (triggers run regardless).
revoke execute on function public.user_agency_ids() from anon;
revoke execute on function public.has_agency_role(uuid, member_role) from anon;
revoke execute on function public.handle_new_user() from public;
