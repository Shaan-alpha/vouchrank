# Compliance — Reviews, Gating, and Consent

> This is the single most important risk for VouchRank. Read it before
> changing the review funnel, sentiment logic, or any review-request copy.

## TL;DR
- **Do not gate reviews.** Offer the same options to every customer regardless of
  rating. Store low ratings; never hide, reroute, or discourage them.
- **Sentiment is internal-only.** Use it for dashboards/alerts, never to decide who
  is asked to review or where they're sent.
- **Capture consent** before storing/displaying video testimonials and before
  managing a client's Google reviews.

## What "review gating" is (and why it's banned)
Review gating = filtering who is invited to leave a public review based on their
satisfaction — e.g. asking happy customers to post on Google while routing unhappy
ones to a private form. As of 2025–2026 this is actively enforced:

- **FTC Consumer Review Rule — 16 CFR Part 465.** Finalized late 2024; enforcement
  underway (first warning letters Dec 2025). Civil penalties up to ~$53,088 per
  violation. (Precedent: Fashion Nova paid $4.2M for suppressing negative reviews.)
- **Google Business Profile review policy** (updated April 2026) explicitly bans
  discouraging negative reviews or selectively soliciting positive ones; violations
  risk profile suspension.
- Major platforms (Birdeye, Podium, BrightLocal, Reputation.com, GatherUp) have all
  removed gating.

Selling a gating feature would expose **our agency customers** to these penalties.
It is a liability, not a differentiator.

## How the funnel stays compliant
See [src/components/HarvesterFunnel.jsx](src/components/HarvesterFunnel.jsx).

1. The customer picks a star rating.
2. **Every** rating then sees the identical set of choices:
   - Post a public review on Google
   - Record a video testimonial
   - Write a public text review
   - Send private feedback to the business
3. The private-feedback channel is offered to **everyone**, not just unhappy
   customers — it is an option, never an automatic destination for low ratings.
4. Sentiment is derived (`positive`/`neutral`/`negative`) purely for internal
   dashboards. It does **not** branch the funnel.

The success screen states feedback is collected in line with FTC & Google policies.

## Consent
- **Video testimonials:** the customer must check an explicit consent box authorizing
  storage and public display before the video review submits.
- **Managing Google reviews on a client's behalf:** Google requires written consent.
  We record it in `location_google_credentials` (`consent_at`, `consent_by`) during
  the OAuth connect flow — verbal consent is not sufficient.

## Review-request messaging
Request copy (SMS/email in `send-review-request` and the Campaigns composer) asks for
**honest** feedback — good or bad — and links to the same funnel for all recipients.
Do not segment recipients by predicted sentiment.

## The guardrail for future changes
Any change that makes the review path depend on rating or predicted sentiment —
hiding the Google option for low ratings, auto-redirecting unhappy customers, A/B
routing by sentiment, suppressing `is_public` based on score — is **prohibited**.
If a request seems to ask for this, stop and flag it against this document.

## Out of scope (still your responsibility before launch)
GDPR/CCPA handling of stored customer PII and video, data-retention policy, and
privacy policy / terms are not yet implemented. Track them in [ROADMAP.md](ROADMAP.md).
