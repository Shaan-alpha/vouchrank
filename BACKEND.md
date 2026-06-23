# VouchRank — Backend & Deployment

The concrete **deploy runbook**. For the conceptual system view see
[ARCHITECTURE.md](ARCHITECTURE.md); for agent/dev context see [AGENTS.md](AGENTS.md);
for the compliance model see [COMPLIANCE.md](COMPLIANCE.md).

End-to-end architecture turning the React/Vite prototype into a real multi-tenant SaaS.

## Stack
- **Frontend:** React 19 + Vite 8 (this repo, `src/`)
- **Backend:** Supabase — Postgres (multi-tenant + RLS), Auth, Storage, Edge Functions (Deno)
- **Billing:** Stripe Billing (subscriptions + webhook → entitlements)
- **Integrations:** Google Business Profile API (reviews), Gemini/OpenAI/Perplexity (AIO), Resend (email), Twilio (SMS)

## Demo vs. live mode
The app runs with **zero backend** out of the box: `src/lib/api.js` returns mock data when
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are unset. Set those (`.env`) to switch
every screen to live Postgres data behind auth. The single seam is `src/lib/api.js`.

## Data model (`supabase/migrations/0001_init_multitenant.sql`)
- Tenant root = `agencies`; users join via `agency_members` (owner/admin/member).
- Tenant-scoped tables (`locations`, `reviews`, `aio_audits`, `aio_queries`, `aio_checklist`,
  `competitors`, `campaigns`) all carry `agency_id` and are protected by RLS.
- RLS uses `SECURITY DEFINER` helpers (`user_agency_ids()`, `has_agency_role()`) with a locked
  `search_path` to avoid policy recursion. Every RLS-referenced column is indexed.
- `location_google_credentials` has **no policies** → reachable only by `service_role`
  (Edge Functions). OAuth refresh tokens never touch the browser.
- Signup trigger `handle_new_user` auto-creates an agency + owner membership.

## Edge Functions (`supabase/functions/`)
| Function | Auth | Purpose |
|---|---|---|
| `submit-review` | public | Funnel posts here; validates, rate-limits, inserts (no anon table access) |
| `widget-reviews` | public | Public reviews for the embeddable widget (CORS `*`) |
| `stripe-checkout` | user | Creates a subscription Checkout session |
| `stripe-webhook` | signature | Syncs subscription status → `agencies.plan` / `max_locations` |
| `google-oauth-start` | user | Returns Google consent URL for a location |
| `google-oauth-callback` | public | Stores refresh token + recorded consent |
| `sync-google-reviews` | service | Pulls GBP reviews (v4) into `reviews` |
| `run-aio-audit` | service | Queries LLMs, computes AI-visibility score |
| `send-review-request` | user | Sends compliant SMS/email request, logs to `campaigns` |

## Live project (already provisioned)
A free Supabase project (ref `fdpmuyllyqrmhljetzco`, region `us-east-1`)
has been created and **migrations 0001–0004 are already applied** to it.
(The Supabase dashboard still labels this project `reviewpulse` from before the
rename — rename it there if you want it to read `vouchrank`; the ref is unchanged.) The frontend
`.env` (gitignored) points at it. Security/performance advisors are clean apart from
intentional items (service-role-only token table; RLS helper functions executable by
`authenticated` as required; unused indexes on the empty DB).

## Deploy order
1. `supabase link --project-ref fdpmuyllyqrmhljetzco` then `supabase db push` (migrations 0001–0004; already applied on the hosted project — this syncs a fresh/local DB).
2. In the dashboard: enable Email auth; confirm the signup trigger ran.
3. `supabase secrets set` all server vars from `.env.example` (everything **without** `VITE_`).
4. `supabase functions deploy` for each function above.
5. Stripe: create the two recurring Prices, set their IDs as secrets, add the webhook endpoint → `stripe-webhook`, copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
6. Google: request **Business Profile API** access (approval takes days–weeks — start now), configure the OAuth consent screen + redirect URI.
7. Twilio: register an **A2P 10DLC** Messaging Service (weeks of lead time) before SMS at scale.

> **Widget hosting:** `public/widget.js` ships in the app build (`dist/widget.js`).
> The embed snippet points at the app origin by default; for production, serve
> `widget.js` from a stable origin/CDN and ensure client `data-api` targets the
> deployed `widget-reviews` URL.
8. Set `VITE_*` vars in the frontend host (e.g. Vercel) and deploy.
9. Schedule cron (Supabase Scheduled Functions / `pg_cron`) for `sync-google-reviews` and `run-aio-audit` per connected location.

## Compliance (built in)
- **No review gating.** The funnel offers public + private options to every customer regardless
  of rating; low ratings are stored, never suppressed or rerouted. Keeps you clear of the FTC
  Consumer Review Rule (16 CFR Part 465) and Google's review policy.
- **Written consent** for managing client reviews is recorded in `location_google_credentials`.
- **Recording consent** is captured before a video testimonial is submitted.

## Known scale considerations
- **Video:** Supabase Storage (bucket in migration 0002) is the simple default; switch to
  **Mux / Cloudflare Stream** for transcoding + cheaper egress at volume (swap `uploadReviewVideo`).
- **Custom domains** for white-label require a routing layer (e.g. Vercel Domains API + middleware)
  — not provided by Supabase alone.
- **LLM model IDs** churn every few months; they are env-overridable (`AIO_*_MODEL`). Verify
  current model names per provider before launch.
