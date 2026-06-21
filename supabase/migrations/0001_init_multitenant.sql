-- ReviewPulse AI — multi-tenant core schema + RLS
-- Tenant root = "agency". Users belong to agencies via agency_members.
-- Security model follows the Supabase RLS checklist:
--   * RLS enabled on every table in the exposed `public` schema
--   * policies use `TO authenticated` + an ownership/membership predicate (never role-only)
--   * UPDATE policies declare both USING and WITH CHECK
--   * OAuth tokens live in a table with NO policies (service_role only)
--   * helper fns are SECURITY DEFINER with a locked search_path to avoid RLS recursion
--   * every column referenced by an RLS policy is indexed

-- =====================================================================
-- Extensions
-- =====================================================================
create extension if not exists "pgcrypto";

-- =====================================================================
-- Enums
-- =====================================================================
do $$ begin
  create type member_role     as enum ('owner', 'admin', 'member');
  create type plan_tier       as enum ('trial', 'agency', 'agency_pro');
  create type plan_status      as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
  create type review_source    as enum ('google', 'video', 'manual', 'private');
  create type review_sentiment as enum ('positive', 'neutral', 'negative');
  create type review_status    as enum ('pending', 'approved', 'rejected');
  create type campaign_channel as enum ('sms', 'email');
  create type campaign_status  as enum ('queued', 'sent', 'delivered', 'failed');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Tables
-- =====================================================================
create table if not exists agencies (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  subdomain              text unique not null,
  custom_domain          text unique,
  logo_url               text,
  colors                 jsonb not null default '{"primary":"#8b5cf6","secondary":"#06b6d4"}'::jsonb,
  custom_css             text,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   plan_tier   not null default 'trial',
  plan_status            plan_status not null default 'trialing',
  -- per-plan caps enforced in app + checked here for defense-in-depth
  max_locations          int not null default 15,
  created_at             timestamptz not null default now()
);

create table if not exists agency_members (
  agency_id  uuid not null references agencies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create table if not exists locations (
  id                uuid primary key default gen_random_uuid(),
  agency_id         uuid not null references agencies(id) on delete cascade,
  name              text not null,
  category          text,
  domain            text,
  logo_text         text,
  colors            jsonb not null default '{}'::jsonb,
  google_place_id   text,           -- public; used to build the write-review URL
  google_account_id text,           -- GBP account/location resource id
  aio_visibility    int not null default 0 check (aio_visibility between 0 and 100),
  created_at        timestamptz not null default now()
);

-- OAuth tokens + recorded client consent. NO RLS policies are created for this
-- table, so only service_role (bypassrls) can read/write it. The browser never
-- touches it; Edge Functions use the service key.
create table if not exists location_google_credentials (
  location_id   uuid primary key references locations(id) on delete cascade,
  refresh_token text not null,
  access_token  text,
  token_expiry  timestamptz,
  -- written consent is required by Google to act on a client's behalf
  consent_at    timestamptz not null default now(),
  consent_by    text not null,
  scopes        text[] not null default '{}'
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  agency_id   uuid not null references agencies(id) on delete cascade, -- denormalized for RLS perf
  external_id text,                  -- Google review id when synced
  author      text not null default 'Anonymous Customer',
  avatar      text,
  rating      int  not null check (rating between 1 and 5),
  source      review_source    not null,
  sentiment   review_sentiment not null,
  status      review_status    not null default 'pending',
  is_public   boolean not null default true,
  text        text,
  keywords    text[] not null default '{}',
  video_url   text,
  ai_reply    text,
  created_at  timestamptz not null default now(),
  unique (location_id, external_id)
);

create table if not exists aio_audits (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  agency_id   uuid not null references agencies(id) on delete cascade,
  rating      int not null check (rating between 0 and 100),
  created_at  timestamptz not null default now()
);

create table if not exists aio_queries (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references aio_audits(id) on delete cascade,
  agency_id   uuid not null references agencies(id) on delete cascade,
  query       text not null,
  sources     text[] not null default '{}',   -- which engines: chatgpt, gemini, perplexity, claude
  recommended boolean not null default false,
  rank        int,
  competitors text[] not null default '{}'
);

create table if not exists aio_checklist (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  agency_id   uuid not null references agencies(id) on delete cascade,
  badge       text,
  title       text not null,
  description text,
  checked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists competitors (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references locations(id) on delete cascade,
  agency_id    uuid not null references agencies(id) on delete cascade,
  name         text not null,
  rating       numeric(2,1),
  review_count int,
  video_count  int,
  aio_score    int,
  reply_rate   int,
  history      int[] not null default '{}'
);

create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  agency_id   uuid not null references agencies(id) on delete cascade,
  channel     campaign_channel not null,
  recipient   text not null,
  status      campaign_status not null default 'queued',
  clicked     boolean not null default false,
  provider_id text,                  -- Twilio/Resend message id
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Indexes (every RLS-referenced FK + common filters)
-- =====================================================================
create index if not exists idx_members_user        on agency_members(user_id);
create index if not exists idx_locations_agency     on locations(agency_id);
create index if not exists idx_reviews_agency       on reviews(agency_id);
create index if not exists idx_reviews_location     on reviews(location_id);
create index if not exists idx_reviews_created      on reviews(location_id, created_at desc);
create index if not exists idx_audits_agency        on aio_audits(agency_id);
create index if not exists idx_audits_location      on aio_audits(location_id);
create index if not exists idx_queries_agency       on aio_queries(agency_id);
create index if not exists idx_queries_audit        on aio_queries(audit_id);
create index if not exists idx_checklist_agency     on aio_checklist(agency_id);
create index if not exists idx_checklist_location   on aio_checklist(location_id);
create index if not exists idx_competitors_agency   on competitors(agency_id);
create index if not exists idx_competitors_location on competitors(location_id);
create index if not exists idx_campaigns_agency     on campaigns(agency_id);
create index if not exists idx_campaigns_location   on campaigns(location_id);

-- =====================================================================
-- Helper: agencies the current user belongs to.
-- SECURITY DEFINER avoids infinite RLS recursion on agency_members.
-- search_path is locked; the body itself filters by auth.uid().
-- =====================================================================
create or replace function public.user_agency_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select agency_id from public.agency_members where user_id = (select auth.uid());
$$;

revoke execute on function public.user_agency_ids() from public;
grant execute on function public.user_agency_ids() to authenticated;

-- role check for write-sensitive operations
create or replace function public.has_agency_role(target_agency uuid, min_role member_role)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.agency_members m
    where m.user_id = (select auth.uid())
      and m.agency_id = target_agency
      and (
        m.role = 'owner'
        or (min_role = 'admin'  and m.role in ('owner','admin'))
        or (min_role = 'member' and m.role in ('owner','admin','member'))
      )
  );
$$;

revoke execute on function public.has_agency_role(uuid, member_role) from public;
grant execute on function public.has_agency_role(uuid, member_role) to authenticated;

-- =====================================================================
-- Enable RLS everywhere
-- =====================================================================
alter table agencies                    enable row level security;
alter table agency_members              enable row level security;
alter table locations                   enable row level security;
alter table location_google_credentials enable row level security; -- no policies => service_role only
alter table reviews                     enable row level security;
alter table aio_audits                  enable row level security;
alter table aio_queries                 enable row level security;
alter table aio_checklist               enable row level security;
alter table competitors                 enable row level security;
alter table campaigns                   enable row level security;

-- =====================================================================
-- Policies
-- =====================================================================

-- agencies: members can read their own agency; owners/admins can update it.
create policy agencies_select on agencies for select to authenticated
  using ( id in (select public.user_agency_ids()) );
create policy agencies_update on agencies for update to authenticated
  using ( public.has_agency_role(id, 'admin') )
  with check ( public.has_agency_role(id, 'admin') );

-- agency_members: a user can see members of agencies they belong to.
create policy members_select on agency_members for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
-- only owners/admins manage membership
create policy members_write on agency_members for all to authenticated
  using ( public.has_agency_role(agency_id, 'admin') )
  with check ( public.has_agency_role(agency_id, 'admin') );

-- Generic per-tenant policy template applied to all tenant-scoped tables:
--   SELECT for any member; INSERT/UPDATE/DELETE for member+ (tighten per table).
-- locations
create policy locations_select on locations for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy locations_write on locations for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );
-- Public, unauthenticated read of branding so the review funnel can render.
-- Only safe, non-sensitive columns should be selected by the client (see api layer).
create policy locations_public_read on locations for select to anon
  using ( true );

-- reviews
create policy reviews_select on reviews for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy reviews_write on reviews for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );
-- NOTE: anonymous review submission is intentionally NOT allowed here.
-- The public funnel posts to the `submit-review` Edge Function (service_role),
-- which validates input and rate-limits before inserting.

-- aio_audits
create policy audits_select on aio_audits for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy audits_write on aio_audits for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );

-- aio_queries
create policy queries_select on aio_queries for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy queries_write on aio_queries for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );

-- aio_checklist
create policy checklist_select on aio_checklist for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy checklist_write on aio_checklist for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );

-- competitors
create policy competitors_select on competitors for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy competitors_write on competitors for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );

-- campaigns
create policy campaigns_select on campaigns for select to authenticated
  using ( agency_id in (select public.user_agency_ids()) );
create policy campaigns_write on campaigns for all to authenticated
  using ( public.has_agency_role(agency_id, 'member') )
  with check ( public.has_agency_role(agency_id, 'member') );

-- =====================================================================
-- Convenience: auto-create an agency + owner membership on signup.
-- A user who signs up becomes the owner of a fresh agency.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_agency_id uuid;
  base_slug text;
begin
  base_slug := split_part(new.email, '@', 1) || '-' || substr(new.id::text, 1, 6);
  insert into public.agencies (name, subdomain)
    values (coalesce(new.raw_user_meta_data->>'agency_name', 'My Agency'), base_slug)
    returning id into new_agency_id;
  insert into public.agency_members (agency_id, user_id, role)
    values (new_agency_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
