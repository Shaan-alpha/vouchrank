# Spec: VouchRank Documentation Set & Roadmap

**Date:** 2026-06-21
**Status:** Approved (design), in production

## Goal
Create a complete, internally-consistent documentation set that serves four audiences
(AI coding agents, future human devs, recruiters/portfolio viewers, and the solo founder)
and a phased roadmap, for the VouchRank codebase.

## Decisions (from brainstorming)
- **Audience:** all four — docs must work for agents, devs, recruiters, and the founder.
- **Agent context format:** `CLAUDE.md` (thin) → `AGENTS.md` (canonical). Cross-tool + auto-loads in Claude Code.
- **Roadmap shape:** phased (Phase 0 Foundation → 4 Scale), each with deliverables + definition of done + status.
- **Extra docs:** README rewrite, COMPLIANCE.md, ARCHITECTURE.md.
- **BACKEND.md stays** as the concrete deploy runbook; ARCHITECTURE.md is the conceptual view; they cross-link, no duplication.

## Deliverables (single source of truth per fact)
1. `README.md` — front door (recruiters + devs): problem, 2026 compliance edge, features, stack, demo-vs-live, quickstart, doc links.
2. `CLAUDE.md` — 3–5 lines pointing to AGENTS.md.
3. `AGENTS.md` — canonical agent/dev context: stack, commands, repo map, conventions, compliance guardrails, RLS rules, env, "read X before changing Y".
4. `ARCHITECTURE.md` — tenancy model, data model, RLS model, edge-function map, demo/live data-layer seam, request flows.
5. `COMPLIANCE.md` — FTC Consumer Review Rule (16 CFR Part 465) + Google policy, review gating definition, how the funnel stays compliant, consent capture, the hard guardrail.
6. `ROADMAP.md` — phased plan with status.
7. `BACKEND.md` — existing; update cross-links to the new docs.

## Ground-truth facts the docs must reflect
- Product: multi-tenant white-label reputation + AI-search-optimization (AIO/GEO) SaaS.
- Frontend: React 19 + Vite 8, lucide-react. Commands: `npm run dev|build|lint|preview`.
- Backend: Supabase (Postgres 17, Auth, Storage, Edge Functions/Deno), Stripe, Google Business Profile API, Gemini 3.x/OpenAI/Perplexity, Resend, Twilio.
- Data-layer seam: `src/lib/api.js` — demo mode (mock data) when env absent; live when `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` set.
- Multi-tenancy: agency = tenant; `agency_members`; RLS via `user_agency_ids()` / `has_agency_role()` (SECURITY DEFINER, locked search_path); every tenant table carries `agency_id`; `location_google_credentials` has no policies (service-role only); public review inserts go through the `submit-review` edge function.
- Compliance: NO review gating; funnel offers identical options to all ratings; sentiment is internal-only; consent captured for video + Google management.
- Live project: `vouchrank` (ref `fdpmuyllyqrmhljetzco`, us-east-1); migrations 0001–0004 applied; advisors clean except intentional items.
- Edge functions: `submit-review`, `stripe-checkout`, `stripe-webhook`, `google-oauth-start`, `google-oauth-callback`, `sync-google-reviews`, `run-aio-audit`, `send-review-request`, shared helpers in `_shared/`.

## Verification
After authoring, fan out agents to fact-check each doc against the real repo (file/path
existence, commands, migration/function names, project facts) and cross-doc consistency;
fix all confirmed errors.
