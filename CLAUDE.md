# CLAUDE.md

Orientation for Claude Code and other AI agents working in this repository.

👉 **The canonical project context is [AGENTS.md](AGENTS.md). Read it first.**

This file is intentionally thin so it auto-loads in Claude Code while the real
content stays in the cross-tool `AGENTS.md`.

## The one rule you must never break

**Never reintroduce review gating.** Do not add logic that routes, hides, or
discourages reviews based on star rating or predicted sentiment. It violates the
FTC Consumer Review Rule and Google's review policy and is the single biggest
risk to this product. See **[COMPLIANCE.md](COMPLIANCE.md)** before touching the
review funnel ([src/components/HarvesterFunnel.jsx](src/components/HarvesterFunnel.jsx)).

## Quick links
- [README.md](README.md) — what the product is, how to run it
- [AGENTS.md](AGENTS.md) — stack, commands, conventions, guardrails
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, data model, RLS
- [COMPLIANCE.md](COMPLIANCE.md) — the review-gating rules
- [BACKEND.md](BACKEND.md) — deploy runbook
- [ROADMAP.md](ROADMAP.md) — what's done and what's next
