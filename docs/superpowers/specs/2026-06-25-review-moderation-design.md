# Review Moderation Workflow — Design

**Date:** 2026-06-25
**Status:** Approved (pending spec review)
**Roadmap item:** Phase 2 — "Review moderation/approval workflow (pending → approved/rejected) surfaced in UI"

---

## Goal

Let an agency triage the reviews it collects — approve genuine ones and reject
spam/fake/abusive submissions — from inside the existing **Reviews Manager** tab
([ReviewList.jsx](../../../src/components/ReviewList.jsx)). The `status`
(`pending` / `approved` / `rejected`) column already exists in the DB and is set
by the edge functions; today the UI can neither see nor change it. This feature
surfaces it and adds the approve/reject controls — behaving identically in
**demo mode** (in-memory React state) and **live mode** (Postgres via RLS).

## Compliance posture (read first)

Moderation here is **content curation for authenticity**, never sentiment
gating. The design is built so gating is structurally hard:

- **Opt-out widget semantics are preserved.** The public widget
  ([widget-reviews](../../../supabase/functions/widget-reviews/index.ts)) shows
  every review where `is_public = true AND status != 'rejected'`. Reviews show
  by default; only an explicit *reject* hides one. We do **not** change the
  widget to require approval — an opt-in model would enable de-facto gating by
  never approving negatives.
- **Reject reasons exclude rating/sentiment.** The fixed reason list has no
  "low rating" option, so the audit trail documents that rejections were for
  spam/authenticity.
- **Uniform treatment across all sources and ratings.** Google-synced reviews
  are moderatable too; rejecting one only hides it from the *agency's own
  widget*, never from Google. No per-source or per-rating carve-outs.
- The status filter and list ordering are rating-agnostic — nothing nudges the
  agency toward rejecting low ratings.

See [COMPLIANCE.md](../../../COMPLIANCE.md); this design adds a short subsection
there documenting the above.

## Non-goals (YAGNI)

- Bulk approve/reject / multi-select.
- A separate `is_public` visibility toggle (to hide a public review from the
  widget, reject it — that's the model).
- A dedicated "Moderation Queue" sub-tab (the Reviews Manager already lists and
  filters reviews; we enhance it in place).
- Auto-moderation of any kind (explicitly prohibited — would be gating).
- Surfacing `reject_note` history / edit log beyond the current value.

---

## Architecture

Follows the existing seam: components never touch `supabase` directly
(guardrail #5). `App.jsx` owns optimistic UI state and calls `src/lib/api.js`,
mirroring the existing `handleAddReviewReply` → `saveReviewReply` pattern.

- **Migration** — `supabase/migrations/0005_review_reject_reason.sql`: a new
  `review_reject_reason` enum + two nullable columns on `reviews`.
- **Data seam** — [src/lib/api.js](../../../src/lib/api.js): surface `status` /
  `rejectReason` / `rejectNote` in `toReview`; add `setReviewStatus`.
- **Mock data** — [src/utils/mockData.js](../../../src/utils/mockData.js): stamp
  `status` onto `MOCK_REVIEWS` so the demo shows the full flow.
- **Shell wiring** — [src/App.jsx](../../../src/App.jsx): one handler
  (`handleSetReviewStatus`) + pass it to `ReviewList`.
- **Component** — [src/components/ReviewList.jsx](../../../src/components/ReviewList.jsx):
  status badges, status filter, a "pending" pill, per-card approve/reject/restore
  actions, and an inline reject-reason picker.
- **Styles** — [src/index.css](../../../src/index.css): status badge variants and
  the reason-picker block (reusing existing glass/inline-edit styles).
- **Docs** — [COMPLIANCE.md](../../../COMPLIANCE.md): a "Review moderation"
  subsection.

---

## Migration: `0005_review_reject_reason.sql`

```sql
-- New reason taxonomy. Deliberately omits any rating/sentiment-based reason:
-- moderation must never depend on how positive a review is (FTC 16 CFR 465 +
-- Google policy). See COMPLIANCE.md.
create type review_reject_reason as enum
  ('spam', 'fake', 'abusive', 'off_topic', 'legal', 'other');

alter table reviews
  add column if not exists reject_reason review_reject_reason,  -- null unless rejected
  add column if not exists reject_note   text;                  -- optional free text
```

`status` and `is_public` are unchanged. RLS is unchanged: `reviews_write` already
grants `member`+ UPDATE within the agency. Run Supabase advisors after applying;
expect no new warnings (additive nullable columns).

---

## Data seam: `src/lib/api.js`

- **`toReview` mapper** — add three fields read from the row:
  `status: r.status`, `rejectReason: r.reject_reason`,
  `rejectNote: r.reject_note`.
- **`setReviewStatus(reviewId, status, { reason = null, note = null } = {})`**
  *(new)*:

  | Mode | Behavior |
  |---|---|
  | Live | `update reviews set { status, reject_reason, reject_note } where id=…`. On `approved`/`pending`, `reject_reason` and `reject_note` are forced to `null` (clears a prior rejection). On `rejected`, persists the chosen `reason` (+ optional `note`). |
  | Demo | no-op returning `{ demo: true }`; App merges optimistically. |

  Direct table update via the authenticated client (same pattern as
  `saveReviewReply`) — no edge function needed; RLS scopes it to the agency.

---

## Mock data: `src/utils/mockData.js`

Add a `status` field to every `MOCK_REVIEWS` entry so the demo exercises all
three states. Distribution (rating-agnostic on purpose): most `approved`, two or
three `pending` across different companies, and one `rejected` (with
`rejectReason: 'spam'`) so the rejected view and reason display are visible
without setup. No new reviews are added; only the `status` field is stamped on
existing ones.

---

## Shell wiring: `src/App.jsx`

**Handler** (mirrors `handleAddReviewReply`):

```js
const handleSetReviewStatus = (reviewId, status, meta = {}) => {
  setReviews(prev => prev.map(r =>
    r.id === reviewId
      ? { ...r, status,
          rejectReason: status === 'rejected' ? (meta.reason ?? null) : null,
          rejectNote:   status === 'rejected' ? (meta.note ?? null)   : null }
      : r));
  api.setReviewStatus(reviewId, status, meta).catch(() => {});
};
```

Passed to the Reviews tab: `<ReviewList reviews={reviews}
onAddReviewReply={handleAddReviewReply} onSetReviewStatus={handleSetReviewStatus} />`.

---

## Component: `src/components/ReviewList.jsx`

**New prop:** `onSetReviewStatus(reviewId, status, meta)`.

**New local state:** `statusFilter` (`'All' | 'pending' | 'approved' | 'rejected'`,
default `'All'`), `rejectingReviewId` (which card's reason picker is open),
`rejectReasonDraft`, `rejectNoteDraft`.

**Status filter** — a new `filter-group` alongside the existing Source and
Sentiment groups: `All / Pending / Approved / Rejected`. Folds into the existing
`filteredReviews` predicate (`statusFilter === 'All' || r.status === statusFilter`).

**Pending pill** — add a fourth card to the stats row: **"N Pending review"**;
clicking it sets `statusFilter = 'pending'` (`id="btn-filter-pending"`).
N = `reviews.filter(r => r.status === 'pending').length`. The three existing
stat cards (avg rating, video count, AI replies posted) are unchanged.

**Status badge** — per card, in the existing `.review-badge-group`, a badge
reflecting `r.status`: Pending (amber), Approved (green/success), Rejected
(muted red). Rejected badge shows the reason label (e.g. "Rejected · Spam").

**Per-card actions** (a new actions row on each card, by status):

- `pending` → **Approve** (`onSetReviewStatus(id, 'approved')`) and **Reject**
  (opens the reason picker).
- `approved` → **Reject** (opens picker). A subtle "Approved" check indicator.
- `rejected` → shows the reason (+ note if present) and **Restore**
  (`onSetReviewStatus(id, 'pending')`, clears reason).

Button ids: `btn-approve-review-${r.id}`, `btn-reject-review-${r.id}`,
`btn-restore-review-${r.id}`.

**Inline reject-reason picker** — opening Reject swaps the card's action row into
a picker (reusing the inline-edit pattern used today for AI-reply drafting):
the six reasons as selectable pills, an optional note `textarea`, and
**Cancel** / **Confirm reject** buttons. **Confirm is disabled until a reason is
selected.** Confirm calls
`onSetReviewStatus(id, 'rejected', { reason, note })` and closes the picker.

**Compliance microcopy** — a single muted line near the moderation controls
(once, in the control header): *"Moderation is for authenticity (spam, fake, or
abusive reviews) — it applies to every rating equally and never hides honest
negative feedback."* Reinforces COMPLIANCE.md at the point of action.

Existing AI-reply, video-playback, keyword-cloud, source/sentiment filters are
untouched.

---

## Styles: `src/index.css`

- Status badge variants: reuse `.review-tag` with modifier classes
  `.status-pending` (amber), `.status-approved` (success green),
  `.status-rejected` (muted red).
- A `.review-mod-actions` row and a `.reject-reason-picker` block (pills +
  textarea), styled to match the existing `.ai-reply-box` / `.filter-btn`
  treatment. No new design tokens.

---

## Docs: `COMPLIANCE.md`

Add a short **"Review moderation"** subsection under the funnel section stating:
moderation curates for authenticity only; opt-out widget default (reject hides,
nothing auto-hides); the reason list is non-sentiment by design; rejecting is
uniform across sources and never affects the public Google listing. Reaffirms the
"never gate by rating/sentiment" guardrail at the new surface.

---

## Edge cases & decisions

- **Reason is required on reject** — enforced in the UI (Confirm disabled until a
  reason pill is chosen). The note is always optional.
- **Restoring a rejected review** returns it to `pending` and clears
  `reject_reason` / `reject_note` (both in optimistic state and via the seam).
- **Private feedback** (`is_public = false`, from the funnel's private channel)
  appears in the list and is moderatable, but never reaches the widget
  regardless of status — `is_public` already excludes it. No special handling.
- **Optimistic writes** follow the existing pattern: update React state first,
  persist via api with `.catch(() => {})`. Surfacing live-mode write failures is
  a separate observability roadmap item.
- **Google reviews** are `approved` on sync; they can still be rejected, which
  only removes them from the agency's widget (compliant — the Google listing is
  untouched).
- **Tenant isolation** — the update goes through the RLS-scoped api call; no
  `agency_id` is set client-side (the row already carries it).

---

## Testing / Definition of done

No unit-test runner exists (scripts: dev/build/lint/preview/verify:ui), so
verification is:

- `npm run lint` → 0 errors.
- `npm run build` → green.
- Supabase advisors → no new actionable warnings after `0005`.
- Manual click-through in **demo mode**: pending reviews show a Pending badge and
  Approve/Reject; approving flips to Approved; rejecting requires a reason, then
  shows Rejected · <reason>; restoring returns it to Pending; the status filter
  and the "N Pending" pill work; AI-reply / video / existing filters still work.
- `verify:ui` not required (no `App.jsx` routing/banner changes), but should stay
  green.

---

## Files touched

- `supabase/migrations/0005_review_reject_reason.sql` — new enum + two columns.
- `src/lib/api.js` — extend `toReview`; add `setReviewStatus`.
- `src/utils/mockData.js` — stamp `status` on `MOCK_REVIEWS`.
- `src/App.jsx` — `handleSetReviewStatus`; pass `onSetReviewStatus` to `ReviewList`.
- `src/components/ReviewList.jsx` — status badges, filter, pending pill,
  approve/reject/restore actions, reject-reason picker, compliance microcopy.
- `src/index.css` — status badge variants + reject-reason picker styles.
- `COMPLIANCE.md` — "Review moderation" subsection.
