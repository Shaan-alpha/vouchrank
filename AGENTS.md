# AGENTS.md

Canonical context for AI agents and developers working on **VouchRank**.
(Claude Code loads [CLAUDE.md](CLAUDE.md), which points here. Other tools — Cursor,
Copilot, Codex — read this file directly.)

---

## What this project is

VouchRank is a **multi-tenant, white-label reputation + AI-search-optimization
(AIO/GEO) SaaS** sold to marketing agencies and local businesses. It:

1. Collects reviews (Google, video, text) through a branded customer funnel.
2. Audits how often LLM search engines (ChatGPT, Gemini, Perplexity) recommend a
   business and scores its "AI Visibility."
3. Turns reviews into social graphics and embeddable widgets.
4. Is white-labeled per agency (branding, sub-accounts, custom domain).

It started as a frontend prototype on mock data and now has a live multi-tenant
Supabase backend. See [ARCHITECTURE.md](ARCHITECTURE.md) for the system view and
[ROADMAP.md](ROADMAP.md) for status.

---

## 🚨 Guardrails (read before coding)

1. **Never reintroduce review gating.** The funnel must offer the *same* options
   (public Google / video / text review **and** a private-feedback channel) to
   *every* customer regardless of star rating. Sentiment is computed for internal
   dashboards only — never to route, hide, or discourage reviews. This is a legal
   requirement (FTC 16 CFR Part 465 + Google policy). Full detail:
   [COMPLIANCE.md](COMPLIANCE.md).
2. **Never expose the Supabase `service_role` key to the browser.** Only
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are client-safe. Server
   secrets live in Supabase Edge Function secrets (see [.env.example](.env.example)).
3. **Never let the browser touch `location_google_credentials`.** That table holds
   OAuth refresh tokens and has *no* RLS policies on purpose — only Edge Functions
   (service role) read it.
4. **Respect tenant isolation.** Every tenant-scoped table carries `agency_id` and
   is protected by RLS. Don't bypass it; don't add `SECURITY DEFINER` to dodge a
   permission error.
5. **Keep the data-layer seam.** All DB access goes through
   [src/lib/api.js](src/lib/api.js), which falls back to mock data in demo mode.
   Don't call `supabase` directly from components.

---

## Stack

- **Frontend:** React 19, Vite 8, `lucide-react`. Plain CSS in
  [src/index.css](src/index.css) + inline styles. No TypeScript, no Tailwind.
- **Backend:** Supabase — Postgres 17, Auth, Storage, Edge Functions (Deno/TS).
- **Integrations:** Stripe (billing), Google Business Profile API (reviews),
  Gemini 3.x / OpenAI / Perplexity (AIO engine), Resend (email), Twilio (SMS).

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build (must stay green)
npm run lint       # ESLint (must stay at 0 errors)
npm run preview    # preview the production build
```

Supabase (CLI): `supabase link --project-ref <ref>`, `supabase db push`,
`supabase functions deploy <name>`, `supabase secrets set KEY=value`.

## Repository map

```
src/
  App.jsx                    # shell: auth gate, tenant selector, tab router, data loading
  main.jsx                   # React entry
  index.css                  # all styles (design tokens, glass cards, funnel, widgets)
  lib/
    supabaseClient.js        # creates client; isSupabaseConfigured flag
    api.js                   # THE data-access seam (demo mock <-> live Postgres + edge fns)
  components/
    Auth.jsx                 # email/password sign in/up (live mode only)
    FirstLocation.jsx        # onboarding when a live agency has no locations yet
    AioDashboard.jsx         # AI-visibility gauge, query audit, checklist, "Run AI Audit"
    ReviewList.jsx           # review moderation + AI reply drafting
    CompetitorBattleboard.jsx
    SocialGenerator.jsx      # review -> PNG via canvas
    BrandingSettings.jsx     # white-label config + "Connect Google" button
    HarvesterFunnel.jsx      # customer-facing review funnel (COMPLIANT — see guardrail #1)
    WidgetsDemo.jsx          # embeddable widget previews + embed code
    Campaigns.jsx            # review-request SMS/email composer + send
    Billing.jsx              # plan cards -> Stripe Checkout
  utils/mockData.js          # demo seed data
supabase/
  config.toml
  migrations/                # 0001 schema+RLS, 0002 storage, 0003 hardening, 0004 fn grants
  functions/                 # edge functions (see ARCHITECTURE.md for the map)
.env.example                 # full env-var reference
BACKEND.md                   # deploy runbook
```

## Conventions

- **React 19 JSX transform:** do **not** `import React` for JSX. Import only the
  hooks you use. ESLint flags unused `React`.
- **Icons:** `lucide-react` only. Import just the icons used.
- **Interactive elements get an `id`** (e.g. `id="btn-run-aio-audit"`) for testing.
- **Per-location components are keyed** by `selectedCompany.id` in `App.jsx` so they
  remount on tenant switch — prefer this over prop→state sync effects.
- **No `setState` synchronously in an effect body** (ESLint rule). Reset state in
  event handlers or async callbacks instead.
- **Data flow:** components receive data + callbacks as props from `App.jsx`; writes
  go through `src/lib/api.js`.

## Environment / demo vs live

- **Demo mode** (no env): `src/lib/api.js` returns `utils/mockData.js`; auth is
  bypassed; every backend action is simulated. The app is fully clickable.
- **Live mode** (`.env` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`):
  auth is enforced, reads/writes hit Postgres (RLS-scoped), edge functions run.
- A live project is already provisioned: **`vouchrank`** (ref
  `fdpmuyllyqrmhljetzco`, region `us-east-1`), migrations 0001–0004 applied.

## Before you change X, read Y
- Review funnel / sentiment / routing → [COMPLIANCE.md](COMPLIANCE.md)
- DB schema / RLS / new tables → [ARCHITECTURE.md](ARCHITECTURE.md) + the Supabase skill
- Deploying functions / secrets / Stripe / Google → [BACKEND.md](BACKEND.md)
- LLM model IDs → they're env-overridable (`AIO_*_MODEL`) and churn; verify current names

## Definition of done for a change
`npm run lint` → 0 errors, `npm run build` → green, and (for DB changes) Supabase
advisors show no new actionable warnings.
