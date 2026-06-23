# Roadmap

Phased plan from foundation to scale. Status as of **2026-06-23**.
Legend: ✅ done · 🟡 in progress · ⬜ not started.

---

## Phase 0 — Foundation ✅ (complete)
The compliant prototype + live multi-tenant backbone.

- ✅ Compliant review funnel (no gating; same options for all ratings; consent capture)
- ✅ Multi-tenant Postgres schema + RLS (migrations 0001–0004), advisors clean
- ✅ Live Supabase project provisioned (`vouchrank` / `fdpmuyllyqrmhljetzco`)
- ✅ Auth (email/password) + auto agency-on-signup trigger
- ✅ Data-layer seam (`src/lib/api.js`) with demo-mode mock fallback
- ✅ Agency dashboard: AIO, reviews, competitors, social generator, widgets, campaigns, branding, billing
- ✅ UI wired to backend actions (Stripe Checkout, Connect Google, Run AI Audit, send request)
- ✅ Edge functions authored (9) + shared helpers
- ✅ "Create first location" onboarding for live mode

**Definition of done:** ✅ `npm run build` green, `npm run lint` 0 errors, demo mode fully clickable, live DB reachable.

---

## Phase 1 — Integrations live 🟡
Make the authored edge functions real with credentials. (Activated 2026-06-23.)

- ✅ Deploy all edge functions (`supabase functions deploy`) + set secrets — all **9** deployed, **11** secrets set
- 🟡 Stripe: $299 / $499 recurring prices + webhook → entitlements wired — **test mode** (`rk_test_`); recreate live prices/webhook before real charges
- 🟡 Google Business Profile: OAuth client + consent screen + redirect wired; **GBP API access request still pending approval** (quota 0 until granted — long lead)
- 🟡 AIO engine: **Gemini live** (`AIO_GEMINI_MODEL=gemini-2.5-flash`); OpenAI / Perplexity deferred (billed)
- 🟡 Resend: API key set; **domain verification** still required before sending
- ⬜ Twilio SMS + **A2P 10DLC registration** (weeks of lead time) — deferred

**Definition of done:** a real agency can connect Google, sync reviews, run a real AIO audit, send a real request, and subscribe via Stripe.

---

## Phase 2 — Private beta 🟡
Operational completeness for first real users.

- ✅ Location management CRUD (add/edit/remove via a modal off the tenant selector; demo + live)
- ⬜ Review moderation/approval workflow (pending → approved/rejected) surfaced in UI
- ✅ Real embeddable `widget.js` (`public/widget.js` + public `widget-reviews` fn; production CDN hosting still TODO)
- ⬜ Error handling, empty states, and observability (logging/alerts)
- ⬜ Team invites (use `agency_members` roles)
- ⬜ Onboarding polish + sample data

**Definition of done:** a handful of design-partner agencies run real clients end-to-end without hand-holding.

---

## Phase 3 — GA / monetization ⬜
Turn it into a paid product.

- ⬜ Public pricing page + trial → paid flow
- ⬜ Entitlement enforcement (location caps by plan, feature gating for Pro)
- ⬜ Stripe billing portal (manage card, invoices, cancel) + dunning on failed payments
- ⬜ Basic product analytics (funnel conversion, requests sent, reviews collected)
- ⬜ Privacy policy / terms; GDPR/CCPA data handling for PII + video (see [COMPLIANCE.md](COMPLIANCE.md))

**Definition of done:** self-serve signup → trial → paid subscription with enforced limits.

---

## Phase 4 — Scale ⬜
Performance, white-label depth, hardening.

- ⬜ Video pipeline → Mux / Cloudflare Stream (transcode + cheaper egress); swap `uploadReviewVideo`
- ⬜ White-label custom domains (routing layer, e.g. Vercel Domains API + middleware)
- ⬜ Seat-based team management + granular roles
- ⬜ Multi-region / read replicas if needed; index tuning as data grows
- ⬜ Data retention controls; SOC2-lite posture; security review

**Definition of done:** handles high review/video volume and per-agency branded domains without manual ops.

---

## Cross-cutting / ongoing
- Keep LLM model IDs current (`AIO_*_MODEL` env overrides).
- Re-run Supabase advisors after every schema change.
- Never reintroduce review gating ([COMPLIANCE.md](COMPLIANCE.md)).
