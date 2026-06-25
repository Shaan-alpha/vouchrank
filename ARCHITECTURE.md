# Architecture

The conceptual system view of VouchRank. For the step-by-step deploy
procedure see [BACKEND.md](BACKEND.md); for the compliance model see
[COMPLIANCE.md](COMPLIANCE.md).

## High-level

```
                 ┌─────────────────────────────────────────────┐
   Agency user → │  React SPA (Vite)                            │
                 │  App.jsx → components → src/lib/api.js (seam) │
                 └───────────────┬─────────────────────────────┘
                                 │ supabase-js (publishable key, RLS-scoped)
                 ┌───────────────▼─────────────────────────────┐
                 │  Supabase                                    │
                 │  ┌────────────┐  ┌──────────┐  ┌──────────┐  │
                 │  │ Postgres   │  │  Auth    │  │ Storage  │  │
                 │  │ (RLS)      │  │          │  │ (videos) │  │
                 │  └────────────┘  └──────────┘  └──────────┘  │
                 │  ┌──────────────────────────────────────┐   │
                 │  │ Edge Functions (Deno, service role)   │   │
                 │  └──────────────────────────────────────┘   │
                 └───────┬───────────┬──────────┬──────────┬────┘
                         │           │          │          │
   Customer (funnel) →  submit-review│   Stripe │  Google  │ LLMs / Resend / Twilio
```

## The data-layer seam (`src/lib/api.js`)

Every component reads and writes through `src/lib/api.js`. It has one decision at
the top — `demoMode = !isSupabaseConfigured`:

- **Demo mode:** returns `src/utils/mockData.js`; write/action functions simulate.
- **Live mode:** queries Postgres via `supabase-js` (RLS-scoped to the signed-in
  agency) and invokes Edge Functions for privileged actions.

This keeps components backend-agnostic and lets the prototype run with zero setup.
Row→UI mappers (`toCompany`, `toReview`) keep the DB shape out of the components.

## Multi-tenancy & RLS

Tenant root is an **agency**. Users join via `agency_members` (roles:
`owner` / `admin` / `member`). Every tenant-scoped table carries `agency_id`.

Access control:
- Helper functions `user_agency_ids()` and `has_agency_role(agency, role)` are
  `SECURITY DEFINER` with a locked `search_path` (avoids RLS recursion on the
  membership table). `authenticated` may execute them; `anon` may not.
- RLS policies: read = "agency_id in my agencies"; write = "I have ≥ member role on
  that agency"; `UPDATE` policies declare both `USING` and `WITH CHECK`.
- `location_google_credentials` has **RLS enabled with no policies** → only the
  `service_role` (Edge Functions) can touch OAuth tokens.
- New signups auto-create an agency + owner membership via the `handle_new_user`
  trigger on `auth.users`.

## Data model

| Table | Purpose |
|---|---|
| `agencies` | Tenant root: branding, subdomain/custom domain, Stripe + plan/entitlements |
| `agency_members` | user ↔ agency with role |
| `locations` | End-businesses an agency manages (branding, `google_place_id`, AIO score) |
| `location_google_credentials` | OAuth tokens + recorded consent (service-role only) |
| `reviews` | Source, rating, sentiment, status (`pending`/`approved`/`rejected`) + reject reason/note, `is_public`, text/video, AI reply |
| `aio_audits` / `aio_queries` | AI-visibility score + per-query LLM results |
| `aio_checklist` | Optimization action items |
| `competitors` | Battleboard comparison rows |
| `campaigns` | Sent review-request log (SMS/email) |

Migrations: `0001` schema + RLS + helpers + signup trigger · `0002` `review-videos`
storage bucket · `0003` advisor hardening (drop redundant SELECT policies, remove
bucket-listing policy, revoke `anon` execute) · `0004` revoke trigger-fn execute ·
`0005` `review_reject_reason` enum + `reviews.reject_reason`/`reject_note` columns
(moderation).

## Edge Functions

| Function | Auth | Purpose |
|---|---|---|
| `submit-review` | public | Funnel posts here; validates, rate-limits, inserts (no anon table access) |
| `widget-reviews` | public | Returns a location's public, non-rejected reviews for the embeddable widget (CORS `*`, cached 5 min) |
| `stripe-checkout` | user | Creates a subscription Checkout session |
| `stripe-webhook` | signature | Syncs subscription → `agencies.plan` / `max_locations` |
| `google-oauth-start` | user | Builds the Google consent URL for a location |
| `google-oauth-callback` | public | Exchanges code, stores refresh token + consent |
| `sync-google-reviews` | service | Pulls GBP reviews (v4) into `reviews` |
| `run-aio-audit` | service | Queries LLMs, computes AI-visibility score |
| `send-review-request` | user | Sends compliant SMS/email request, logs to `campaigns` |

Shared helpers (CORS, service-role client, user resolution) live in
`supabase/functions/_shared/`.

## Key request flows

- **Customer leaves a review:** funnel → `submit-review` (service role) → `reviews`
  (status `pending`). Agency approves/rejects in `ReviewList` — rejecting requires a
  non-sentiment reason (spam/fake/abusive/off-topic/legal/other). Low ratings are
  stored, never suppressed; display is opt-out (everything `is_public` and not
  `rejected` shows). See [COMPLIANCE.md](COMPLIANCE.md).
- **Embedded widget loads:** client site `widget.js` → `widget-reviews` (service
  role, CORS `*`) → returns `is_public`, non-rejected reviews (any rating) →
  rendered on the client's page.
- **AI audit:** dashboard "Run AI Audit" → `run-aio-audit` → asks Gemini/OpenAI/
  Perplexity local-intent queries → scores recommendation rate → writes
  `aio_audits` + `aio_queries` + `locations.aio_visibility`.
- **Billing:** `Billing` page → `stripe-checkout` → Stripe → `stripe-webhook` →
  entitlements on the agency row.
- **Google connect:** `BrandingSettings` "Connect Google" → `google-oauth-start` →
  Google consent → `google-oauth-callback` stores token + consent → scheduled
  `sync-google-reviews`.

## Known scale boundaries
- **Video:** Supabase Storage is the default; move to Mux / Cloudflare Stream for
  transcoding + cheaper egress at volume (swap `uploadReviewVideo`).
- **Custom domains:** white-label subdomains need a routing layer (e.g. Vercel
  Domains API + middleware) — not provided by Supabase.
- **LLM models:** IDs churn; `AIO_*_MODEL` env vars override the defaults.
