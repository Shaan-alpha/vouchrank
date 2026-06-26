-- Audit hardening pass (security + entitlement + abuse fixes).
-- Additive/safe to apply to the live table. Re-run advisors after pushing.
--
-- Covers:
--   H1  drop the anon "read every location" policy (cross-tenant disclosure)
--   H2  stop tenants from self-granting plan/max_locations (billing bypass)
--   M2  remove blanket anon upload to the video bucket (use signed URLs instead)
--   F6  enforce the per-plan location cap in the DB, not just the UI

-- =====================================================================
-- H1 — locations: remove the anon "select all" policy.
-- It exposed every agency's location rows (name, domain, google_account_id,
-- agency_id) to anyone holding the publishable key. The public review funnel
-- now reads a single location's safe fields through the `public-location`
-- Edge Function (service_role), so no anon table access is needed.
-- =====================================================================
drop policy if exists locations_public_read on locations;

-- =====================================================================
-- H2 — agencies: entitlement columns must be service_role-only.
-- The agencies_update RLS policy let any owner/admin update their own row,
-- including plan / plan_status / max_locations / stripe_* — i.e. grant
-- themselves a paid tier for free. RLS can't restrict columns, so we layer
-- column-level privileges: revoke UPDATE, then grant ONLY branding columns.
-- The Stripe webhook (service_role) still writes entitlements; it bypasses
-- both RLS and these grants.
-- =====================================================================
revoke update on public.agencies from anon, authenticated;
grant  update (name, subdomain, custom_domain, logo_url, colors, custom_css)
  on public.agencies to authenticated;
-- (agencies_update policy stays: it still gates the row to owners/admins.)

-- =====================================================================
-- M2 — review-videos: drop the blanket anon/authenticated INSERT policy.
-- Uploads now go through short-lived signed upload URLs minted by the
-- `create-upload-url` Edge Function (service_role), which authorize one
-- object each and bypass RLS — so no broad insert policy is required.
-- Public READ is unaffected (the bucket is public; objects serve by URL).
-- =====================================================================
drop policy if exists "review_videos_anon_upload" on storage.objects;

-- =====================================================================
-- F6 — locations: enforce the per-agency cap server-side.
-- The UI blocks "Add location" at the cap, but nothing stopped a direct
-- insert. This trigger makes max_locations authoritative. SECURITY DEFINER
-- with a locked search_path; triggers fire regardless of EXECUTE grants.
-- =====================================================================
create or replace function public.enforce_location_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap int;
  cnt int;
begin
  select max_locations into cap from public.agencies where id = new.agency_id;
  if cap is null then
    return new;
  end if;
  select count(*) into cnt from public.locations where agency_id = new.agency_id;
  if cnt >= cap then
    raise exception 'location_cap_reached'
      using errcode = 'check_violation',
            hint = 'Upgrade the plan to add more locations.';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_location_cap() from public, anon, authenticated;

drop trigger if exists trg_enforce_location_cap on public.locations;
create trigger trg_enforce_location_cap
  before insert on public.locations
  for each row execute function public.enforce_location_cap();
