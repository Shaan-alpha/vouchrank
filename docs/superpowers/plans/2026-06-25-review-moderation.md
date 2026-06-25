# Review Moderation Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agency approve/reject the reviews it collects from inside the Reviews Manager, surfacing the existing `review.status` and capturing a non-sentiment reason on rejection.

**Architecture:** Enhance the existing `ReviewList` component in place. Status flows DB → `api.js` seam → `App.jsx` optimistic state → `ReviewList`, mirroring the existing `handleAddReviewReply` → `saveReviewReply` pattern. A new migration adds a reject-reason taxonomy; the public widget feed is unchanged (opt-out semantics).

**Tech Stack:** React 19 (no `import React`), Vite 8, `lucide-react`, plain CSS in `src/index.css`, Supabase Postgres (RLS). No TypeScript, no Tailwind.

**Spec:** [docs/superpowers/specs/2026-06-25-review-moderation-design.md](../specs/2026-06-25-review-moderation-design.md)

## Global Constraints

- **Never gate by rating/sentiment.** No auto-moderation; the reject-reason list has **no** rating/sentiment option; status filter and ordering are rating-agnostic. (FTC 16 CFR 465 + Google policy — see [COMPLIANCE.md](../../../COMPLIANCE.md).)
- **Keep the data-layer seam.** Components never call `supabase` directly; all DB access goes through `src/lib/api.js`. Demo mode must stay fully clickable with no env.
- **React 19 JSX transform:** do NOT `import React`; import only the hooks/icons used (ESLint flags unused imports).
- **Interactive elements get an `id`** (e.g. `id="btn-approve-review-<id>"`).
- **No unit-test runner exists.** Per-task verification gate is `npm run lint` → 0 errors and `npm run build` → green, plus a manual demo note. Automated integration coverage is the Playwright smoke script (`npm run verify:ui`-style), added in Task 7. This follows the repo's established e2e pattern.
- **Widget semantics unchanged:** `widget-reviews` shows `is_public = true AND status != 'rejected'`. Do not touch it.

---

### Task 1: Migration — reject-reason enum + columns

**Files:**
- Create: `supabase/migrations/0005_review_reject_reason.sql`

**Interfaces:**
- Produces: `reviews.status` (already exists, enum `pending|approved|rejected`), new `reviews.reject_reason` (enum `review_reject_reason`, nullable), new `reviews.reject_note` (text, nullable).

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0005_review_reject_reason.sql`:

```sql
-- Review moderation: reason taxonomy for rejected reviews.
-- DELIBERATELY omits any rating/sentiment-based reason. Moderation must never
-- depend on how positive a review is (FTC 16 CFR Part 465 + Google policy).
-- See COMPLIANCE.md. Additive + nullable: safe to apply to a live table.

do $$ begin
  create type review_reject_reason as enum
    ('spam', 'fake', 'abusive', 'off_topic', 'legal', 'other');
exception
  when duplicate_object then null;
end $$;

alter table reviews
  add column if not exists reject_reason review_reject_reason,  -- null unless rejected
  add column if not exists reject_note   text;                  -- optional internal note
```

- [ ] **Step 2: Apply to the live project** *(touches the live DB — confirm with the user first)*

Apply via the Supabase MCP `apply_migration` to project ref `fdpmuyllyqrmhljetzco`, name `review_reject_reason`, with the SQL above. Additive nullable columns + a new enum — non-breaking and trivially reversible (`alter table reviews drop column …`, `drop type …`).

- [ ] **Step 3: Verify the columns exist**

Use Supabase MCP `list_tables` (or `execute_sql`: `select column_name, data_type from information_schema.columns where table_name='reviews' and column_name in ('reject_reason','reject_note');`).
Expected: two rows — `reject_reason` (USER-DEFINED) and `reject_note` (text).

- [ ] **Step 4: Run advisors**

Use Supabase MCP `get_advisors` for `security` and `performance`.
Expected: no NEW actionable warnings attributable to this change.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_review_reject_reason.sql
git commit -m "feat(db): add review reject_reason enum + columns (migration 0005)"
```

---

### Task 2: Data seam — surface status + `setReviewStatus`

**Files:**
- Modify: `src/lib/api.js` (`toReview` mapper ~lines 34-48; add `setReviewStatus` after `saveReviewReply` ~line 202)

**Interfaces:**
- Consumes: `reviews.reject_reason`, `reviews.reject_note` (Task 1).
- Produces:
  - `toReview(r)` now returns `status: string`, `rejectReason: string|null`, `rejectNote: string|null` (in addition to existing fields).
  - `setReviewStatus(reviewId: string, status: 'approved'|'rejected'|'pending', opts?: { reason?: string|null, note?: string|null }): Promise<{ok:true}|{demo:true}>`.

- [ ] **Step 1: Extend the `toReview` mapper**

In `src/lib/api.js`, replace the `toReview` object body to add three fields (keep all existing fields):

```js
const toReview = (r) => ({
  id: r.id,
  companyId: r.location_id,
  author: r.author,
  avatar: r.avatar,
  rating: r.rating,
  source: r.source ? r.source[0].toUpperCase() + r.source.slice(1) : 'Manual',
  text: r.text,
  keywords: r.keywords || [],
  sentiment: r.sentiment,
  status: r.status,
  rejectReason: r.reject_reason ?? null,
  rejectNote: r.reject_note ?? null,
  date: new Date(r.created_at).toLocaleDateString(),
  videoUrl: r.video_url,
  aiReply: r.ai_reply,
  isPublic: r.is_public,
});
```

- [ ] **Step 2: Add `setReviewStatus`**

In `src/lib/api.js`, immediately after the `saveReviewReply` function (~line 202), add:

```js
// Moderation: approve / reject / restore a review. Rejecting persists a
// non-sentiment reason (+ optional note); approve/pending clear any prior
// rejection. Demo mode is a no-op — App.jsx owns optimistic state.
export async function setReviewStatus(reviewId, status, { reason = null, note = null } = {}) {
  if (demoMode) return { demo: true };
  const patch =
    status === 'rejected'
      ? { status, reject_reason: reason, reject_note: note }
      : { status, reject_reason: null, reject_note: null };
  const { error } = await supabase.from('reviews').update(patch).eq('id', reviewId);
  if (error) throw error;
  return { ok: true };
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 lint errors, build green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.js
git commit -m "feat(api): surface review status + add setReviewStatus seam"
```

---

### Task 3: Mock data — stamp `status` on `MOCK_REVIEWS`

**Files:**
- Modify: `src/utils/mockData.js` (`MOCK_REVIEWS`, lines ~51-178)

**Interfaces:**
- Consumes: nothing.
- Produces: each `MOCK_REVIEWS` entry now carries `status` (and the one rejected entry carries `rejectReason` + `rejectNote`). Demo mode returns these objects verbatim (camelCase, matching `toReview` output).

Distribution is rating-agnostic on purpose: a 5★ sits in `pending`, a 2★ stays `approved`, and a 5★ is `rejected` for authenticity — demonstrating that moderation is not sentiment-based. austin-dental (the default tenant) carries all three states.

- [ ] **Step 1: Add `status` to each review**

In `src/utils/mockData.js`, add the indicated field(s) to each object (append after the existing `sentiment`/`date` lines; only the additions are shown):

- `r1` (Sarah Jenkins): add `status: "approved",`
- `r2` (Marcus Vance): add `status: "pending",`
- `r3` (Elena Rostova): add `status: "approved",`
- `r4` (Danielle K.): add `status: "rejected", rejectReason: "fake", rejectNote: "Reviewer could not be matched to an appointment record.",`
- `r5` (Johnathan Miller): add `status: "approved",`
- `r6` (Samantha Cole): add `status: "pending",`
- `r7` (Brian O'Connor): add `status: "approved",`
- `r8` (Alice Cooper): add `status: "approved",`
- `r9` (Gary Peterson): add `status: "approved",`

Example for `r4` (the rejected one), for clarity:

```js
{
  id: "r4",
  companyId: "austin-dental",
  author: "Danielle K.",
  avatar: "DK",
  rating: 5,
  source: "Video",
  text: "The pediatric dentists here were fantastic with my 6-year-old. No tears, very gentle, and he actually enjoyed the prize box! Highly recommend for families.",
  videoUrl: "simulated-video-2.mp4",
  keywords: ["pediatric dentists", "gentle", "families"],
  sentiment: "positive",
  date: "3 weeks ago",
  status: "rejected",
  rejectReason: "fake",
  rejectNote: "Reviewer could not be matched to an appointment record.",
  aiReply: null
},
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 lint errors, build green.

- [ ] **Step 3: Commit**

```bash
git add src/utils/mockData.js
git commit -m "feat(demo): stamp moderation status on mock reviews"
```

---

### Task 4: Shell wiring — `handleSetReviewStatus` + prop

**Files:**
- Modify: `src/App.jsx` (add handler after `handleAddReviewReply` ~line 117; pass prop to `ReviewList` ~line 312)

**Interfaces:**
- Consumes: `api.setReviewStatus` (Task 2).
- Produces: `onSetReviewStatus(reviewId, status, meta)` prop passed to `ReviewList`.

- [ ] **Step 1: Add the handler**

In `src/App.jsx`, immediately after `handleAddReviewReply` (the function ending at ~line 117), add:

```js
const handleSetReviewStatus = (reviewId, status, meta = {}) => {
  setReviews((prev) =>
    prev.map((r) =>
      r.id === reviewId
        ? {
            ...r,
            status,
            rejectReason: status === 'rejected' ? (meta.reason ?? null) : null,
            rejectNote: status === 'rejected' ? (meta.note ?? null) : null,
          }
        : r,
    ),
  );
  api.setReviewStatus(reviewId, status, meta).catch(() => {});
};
```

- [ ] **Step 2: Pass the prop to `ReviewList`**

In `src/App.jsx`, find the reviews-tab render (~line 312):

```jsx
{activeTab === 'reviews' && (
  <ReviewList reviews={reviews} onAddReviewReply={handleAddReviewReply} />
)}
```

Replace with:

```jsx
{activeTab === 'reviews' && (
  <ReviewList
    reviews={reviews}
    onAddReviewReply={handleAddReviewReply}
    onSetReviewStatus={handleSetReviewStatus}
  />
)}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 lint errors, build green. (`onSetReviewStatus` is unused inside `ReviewList` until Task 5 — that's fine; props don't trigger unused-var lint.)

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(app): wire handleSetReviewStatus into ReviewList"
```

---

### Task 5: ReviewList — status display (badge, filter, pending card)

Read-only surfacing: shows each review's status, adds a status filter, and a clickable "Pending" stat card. No mutations yet.

**Files:**
- Modify: `src/components/ReviewList.jsx`
- Modify: `src/index.css` (status-badge variants)

**Interfaces:**
- Consumes: `reviews[].status`, `reviews[].rejectReason` (Task 3); `onSetReviewStatus` prop (Task 4, used in Task 6).
- Produces: `statusFilter` state; module-level `REJECT_REASONS` / `REASON_LABEL` (also used in Task 6).

- [ ] **Step 1: Update imports**

In `src/components/ReviewList.jsx` line 1-2, replace the import block:

```jsx
import { useState } from 'react';
import { Star, Play, X, Sparkles, Filter, Video, MessageSquare, Clock, CheckCircle, Ban, RotateCcw, ShieldCheck } from 'lucide-react';
```

- [ ] **Step 2: Add the reason taxonomy + status filter state**

Directly below the imports (above `export default function ReviewList`), add the module-level constants:

```jsx
// Non-sentiment reject reasons (see COMPLIANCE.md). No rating/sentiment option.
const REJECT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fake', label: 'Fake / not a real customer' },
  { value: 'abusive', label: 'Abusive / offensive' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'legal', label: 'Legal / privacy' },
  { value: 'other', label: 'Other' },
];
const REASON_LABEL = Object.fromEntries(REJECT_REASONS.map((r) => [r.value, r.label]));
```

Update the function signature (line 4):

```jsx
export default function ReviewList({ reviews, onAddReviewReply, onSetReviewStatus }) {
```

Add state alongside the existing `useState` calls (after `selectedKeyword`, ~line 7):

```jsx
  const [statusFilter, setStatusFilter] = useState('All');
```

- [ ] **Step 3: Filter by status + compute pending count**

Extend the `filteredReviews` predicate (~lines 29-34) to include status:

```jsx
  const filteredReviews = reviews.filter(r => {
    const matchSource = sourceFilter === 'All' || r.source === sourceFilter;
    const matchSentiment = sentimentFilter === 'All' || r.sentiment === sentimentFilter;
    const matchKeyword = selectedKeyword === 'All' || r.keywords.includes(selectedKeyword);
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSource && matchSentiment && matchKeyword && matchStatus;
  });
```

Add below the `videoCount` line (~line 41):

```jsx
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
```

- [ ] **Step 4: Add the "Pending" stat card**

In the `stats-grid` (after the "AI Replies Posted" card, before the closing `</div>` of the grid, ~line 144), add a fourth card:

```jsx
        <div
          className="glass-card stat-card"
          onClick={() => setStatusFilter('pending')}
          id="btn-filter-pending"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon" style={{ color: pendingCount ? 'var(--warning)' : 'var(--text-muted)' }}>
            <Clock />
          </div>
          <div className="stat-info">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>
```

- [ ] **Step 5: Add the status filter group + compliance note**

In the `reviews-control-header`, after the Sentiment `filter-group` block (~line 182), add a third filter group:

```jsx
            {/* Status (moderation) filter */}
            <div className="filter-group">
              {['All', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                  id={`btn-status-${st === 'All' ? 'all' : st}`}
                >
                  {st === 'All' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
```

Then, immediately after the closing `</div>` of `reviews-control-header` (~line 184), add the one-line compliance note:

```jsx
        <p className="mod-compliance-note">
          <ShieldCheck style={{ width: '13px', height: '13px' }} />
          Moderation is for authenticity (spam, fake, or abusive reviews) — it applies to every rating equally and never hides honest negative feedback.
        </p>
```

- [ ] **Step 6: Add the status badge to each card**

In the `review-badge-group` (~lines 248-255), add a status badge as the first child:

```jsx
                    <div className="review-badge-group">
                      <span className={`review-tag status-${r.status}`}>
                        {r.status === 'pending' && 'Pending'}
                        {r.status === 'approved' && 'Approved'}
                        {r.status === 'rejected' && `Rejected · ${REASON_LABEL[r.rejectReason] || 'Removed'}`}
                      </span>
                      <span className={`review-tag ${r.source === 'Video' ? 'tag-video' : ''}`}>
                        {r.source}
                      </span>
                      <span className="review-tag" style={{ textTransform: 'uppercase' }}>
                        {r.sentiment}
                      </span>
                    </div>
```

- [ ] **Step 7: Add status-badge CSS**

Append to `src/index.css` (e.g. after the `.review-tag` rules, near line 600 — or at end of file):

```css
/* --- Review moderation: status badges --- */
.review-tag.status-pending {
  background: rgba(245, 158, 11, 0.12);
  color: var(--warning);
  border-color: rgba(245, 158, 11, 0.28);
}
.review-tag.status-approved {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
  border-color: rgba(16, 185, 129, 0.28);
}
.review-tag.status-rejected {
  background: rgba(239, 68, 68, 0.10);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.24);
}
.mod-compliance-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  margin: 4px 0 0;
}
```

- [ ] **Step 8: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 lint errors, build green.

- [ ] **Step 9: Manual demo check**

Run: `npm run dev`, open the Reviews Manager (Review Harvester tab). Expected: each card shows a status badge; the Status filter (All/Pending/Approved/Rejected) narrows the list; the "Pending Review" stat card shows a count (1 for austin-dental) and clicking it filters to pending; the compliance note line is visible.

- [ ] **Step 10: Commit**

```bash
git add src/components/ReviewList.jsx src/index.css
git commit -m "feat(reviews): surface moderation status — badge, filter, pending card"
```

---

### Task 6: ReviewList — moderation actions (approve / reject / restore)

The interactive mutations: per-card action row + inline reject-reason picker.

**Files:**
- Modify: `src/components/ReviewList.jsx`
- Modify: `src/index.css` (action row + reason-picker styles)

**Interfaces:**
- Consumes: `onSetReviewStatus(reviewId, status, { reason, note })` (Task 4); `REJECT_REASONS` / `REASON_LABEL` (Task 5).
- Produces: nothing downstream.

- [ ] **Step 1: Add reject-picker state**

Alongside the existing `useState` calls (after `statusFilter`), add:

```jsx
  const [rejectingReviewId, setRejectingReviewId] = useState(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState('');
  const [rejectNoteDraft, setRejectNoteDraft] = useState('');
```

- [ ] **Step 2: Add the moderation handlers**

After the existing `handleSaveReply` function (~line 108), add:

```jsx
  const handleApprove = (id) => onSetReviewStatus(id, 'approved');
  const handleRestore = (id) => onSetReviewStatus(id, 'pending');

  const openReject = (id) => {
    setRejectingReviewId(id);
    setRejectReasonDraft('');
    setRejectNoteDraft('');
  };
  const cancelReject = () => {
    setRejectingReviewId(null);
    setRejectReasonDraft('');
    setRejectNoteDraft('');
  };
  const confirmReject = (id) => {
    if (!rejectReasonDraft) return;
    onSetReviewStatus(id, 'rejected', {
      reason: rejectReasonDraft,
      note: rejectNoteDraft.trim() || null,
    });
    cancelReject();
  };
```

- [ ] **Step 3: Add the moderation actions row to each card**

In `src/components/ReviewList.jsx`, immediately after the closing `</div>` of the `ai-reply-block` (~line 335) and before the card's closing `</div>` (~line 337), insert:

```jsx
                {/* Moderation actions */}
                <div className="review-mod-actions">
                  {rejectingReviewId === r.id ? (
                    <div className="reject-reason-picker">
                      <div className="reject-reason-title">Why are you rejecting this review?</div>
                      <div className="reject-reason-pills">
                        {REJECT_REASONS.map((reason) => (
                          <button
                            key={reason.value}
                            type="button"
                            className={`reason-pill ${rejectReasonDraft === reason.value ? 'active' : ''}`}
                            onClick={() => setRejectReasonDraft(reason.value)}
                            id={`reason-${reason.value}-${r.id}`}
                          >
                            {reason.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={rejectNoteDraft}
                        onChange={(e) => setRejectNoteDraft(e.target.value)}
                        placeholder="Optional internal note…"
                        className="input-control"
                        style={{ width: '100%', minHeight: '54px', margin: '8px 0', fontSize: '12px', background: '#090a0f' }}
                      />
                      <div className="ai-reply-actions">
                        <button className="btn-sm-action" onClick={cancelReject}>Cancel</button>
                        <button
                          className="btn-sm-action primary"
                          onClick={() => confirmReject(r.id)}
                          disabled={!rejectReasonDraft}
                          id={`btn-confirm-reject-${r.id}`}
                        >
                          Confirm reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="review-mod-buttons">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn-sm-action primary" onClick={() => handleApprove(r.id)} id={`btn-approve-review-${r.id}`}>
                            <CheckCircle style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Approve
                          </button>
                          <button className="btn-sm-action" onClick={() => openReject(r.id)} id={`btn-reject-review-${r.id}`}>
                            <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <>
                          <span className="mod-state-label approved">
                            <CheckCircle style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Approved
                          </span>
                          <button className="btn-sm-action" onClick={() => openReject(r.id)} id={`btn-reject-review-${r.id}`}>
                            <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'rejected' && (
                        <>
                          <span className="mod-state-label rejected">
                            <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Rejected · {REASON_LABEL[r.rejectReason] || 'Removed'}
                            {r.rejectNote ? ` — ${r.rejectNote}` : ''}
                          </span>
                          <button className="btn-sm-action" onClick={() => handleRestore(r.id)} id={`btn-restore-review-${r.id}`}>
                            <RotateCcw style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Restore
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
```

- [ ] **Step 4: Add action-row + picker CSS**

Append to `src/index.css` (after the status-badge block from Task 5):

```css
/* --- Review moderation: actions + reject picker --- */
.review-mod-actions {
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 12px;
}
.review-mod-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.btn-sm-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mod-state-label {
  font-size: 12px;
  font-weight: 600;
}
.mod-state-label.approved { color: var(--success); }
.mod-state-label.rejected { color: #f87171; }

.reject-reason-picker {
  background: #0c0d12;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 12px;
}
.reject-reason-title {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}
.reject-reason-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.reason-pill {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-secondary);
  transition: var(--transition);
}
.reason-pill.active {
  background: rgba(239, 68, 68, 0.14);
  border-color: #f87171;
  color: #fff;
}
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 lint errors, build green.

- [ ] **Step 6: Manual demo check**

Run `npm run dev`, open Review Harvester. Expected: a pending review shows **Approve** / **Reject**; clicking **Approve** flips it to Approved; **Reject** opens the reason picker — **Confirm reject** is disabled until a reason pill is chosen; confirming shows `Rejected · <reason>` (+ note); a rejected review shows **Restore** which returns it to Pending and clears the reason.

- [ ] **Step 7: Commit**

```bash
git add src/components/ReviewList.jsx src/index.css
git commit -m "feat(reviews): approve/reject/restore actions + reject-reason picker"
```

---

### Task 7: Playwright moderation smoke check

Adds automated demo-mode coverage of the approve/reject/restore flow, following the repo's existing e2e pattern ([e2e/verify-returns.mjs](../../../e2e/verify-returns.mjs)).

**Files:**
- Create: `e2e/verify-moderation.mjs`
- Modify: `package.json` (add `verify:moderation` script)

**Interfaces:**
- Consumes: the demo-mode UI and `id`s from Tasks 5-6 (`tab-btn-reviews`, `btn-status-pending`, `btn-approve-review-*`, `btn-reject-review-*`, `reason-spam-*`, `btn-confirm-reject-*`, `btn-restore-review-*`).

- [ ] **Step 1: Write the smoke script**

Create `e2e/verify-moderation.mjs`:

```js
// UI smoke check: review moderation approve/reject/restore in DEMO mode.
//
//   npm run verify:moderation
//
// Spawns a demo-mode dev server (empty VITE_* → auth bypassed, mock data),
// drives it with headless Chromium, and exits non-zero if any check fails.
// Pass BASE=<url> to test an already-running server instead of spawning one.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || '5181';
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server at ${url} did not come up`);
}

let server = null;
if (!process.env.BASE) {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    stdio: 'ignore',
  });
  await waitForServer(BASE);
}
function stopServer() {
  if (!server) return;
  if (process.platform === 'win32') spawn('taskkill', ['/F', '/T', '/PID', String(server.pid)]);
  else { try { process.kill(-server.pid); } catch { try { server.kill('SIGKILL'); } catch { /* gone */ } } }
}

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${detail}`); };

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sidebar', { timeout: 15000 });
  await page.click('#tab-btn-reviews');
  await page.waitForSelector('#btn-filter-pending', { timeout: 10000 });

  // 1) Pending card shows a count and filters to pending.
  await page.click('#btn-filter-pending');
  const pendingCards = await page.locator('.review-tag.status-pending').count();
  record('pending filter shows pending reviews', pendingCards > 0, `${pendingCards} pending cards`);

  // 2) Approve the first pending review → its Approve button disappears.
  const approveBtn = page.locator('[id^="btn-approve-review-"]').first();
  const approveId = await approveBtn.getAttribute('id');
  await approveBtn.click();
  await page.click('#btn-status-all');
  const approveGone = (await page.locator(`[id="${approveId}"]`).count()) === 0;
  record('approve flips status', approveGone, `${approveId} no longer pending`);

  // 3) Reject flow: confirm is disabled until a reason is chosen.
  const rejectBtn = page.locator('[id^="btn-reject-review-"]').first();
  const rid = (await rejectBtn.getAttribute('id')).replace('btn-reject-review-', '');
  await rejectBtn.click();
  const confirm = page.locator(`#btn-confirm-reject-${rid}`);
  const disabledFirst = await confirm.isDisabled();
  await page.click(`#reason-spam-${rid}`);
  const enabledAfter = !(await confirm.isDisabled());
  record('reject requires a reason', disabledFirst && enabledAfter, `disabled→${disabledFirst}, enabled→${enabledAfter}`);

  // 4) Confirm reject → review shows rejected badge.
  await confirm.click();
  await page.click('#btn-status-rejected');
  const rejectedCards = await page.locator('.review-tag.status-rejected').count();
  record('confirm reject shows rejected', rejectedCards > 0, `${rejectedCards} rejected cards`);

  // 5) Restore → returns to pending.
  const restoreBtn = page.locator('[id^="btn-restore-review-"]').first();
  await restoreBtn.click();
  await page.click('#btn-status-rejected');
  const stillRejected = await page.locator('.review-tag.status-rejected').count();
  record('restore clears rejection', stillRejected < rejectedCards, `rejected ${rejectedCards}→${stillRejected}`);

  await page.screenshot({ path: `${OUT}/06-moderation.png` });
} finally {
  await browser.close();
  stopServer();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed  ·  screenshot in ${OUT}/`);
process.exitCode = failed ? 1 : 0;
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add after `"verify:ui"`:

```json
    "verify:moderation": "node e2e/verify-moderation.mjs"
```

(Remember to add the comma after the preceding `verify:ui` line.)

- [ ] **Step 3: Run the smoke check**

Run: `npm run verify:moderation`
Expected: `5/5 checks passed`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add e2e/verify-moderation.mjs package.json
git commit -m "test(e2e): smoke-check review moderation approve/reject/restore"
```

---

### Task 8: Docs — COMPLIANCE.md subsection + ROADMAP tick

**Files:**
- Modify: `COMPLIANCE.md` (add subsection after "How the funnel stays compliant")
- Modify: `ROADMAP.md` (Phase 2 line)

**Interfaces:** none.

- [ ] **Step 1: Add the COMPLIANCE.md subsection**

In `COMPLIANCE.md`, after the "How the funnel stays compliant" section (before "## Consent"), insert:

```markdown
## Review moderation (curation, not gating)

Agencies can approve or reject collected reviews in the Reviews Manager. This is
content curation for **authenticity**, never sentiment gating:

- **Opt-out display.** The public widget shows every review where `is_public`
  and `status != 'rejected'`. Reviews appear by default; nothing is auto-hidden.
  We deliberately do **not** require approval before display — an opt-in model
  would let an agency gate by never approving negatives.
- **Non-sentiment reasons.** Rejecting requires a reason from a fixed list
  (spam, fake, abusive, off-topic, legal, other). There is intentionally **no**
  "low rating" reason, so the audit trail shows rejections aren't sentiment-based.
- **Uniform across sources.** Google-synced reviews can be rejected too;
  rejecting only hides a review from the agency's own widget — it never affects
  the public Google listing.

Any change that makes display depend on rating or predicted sentiment (auto-
rejecting low ratings, requiring approval to show, sorting to nudge rejecting
negatives) is prohibited under the guardrail above.
```

- [ ] **Step 2: Tick the ROADMAP item**

In `ROADMAP.md`, change the Phase 2 line:

```
- ⬜ Review moderation/approval workflow (pending → approved/rejected) surfaced in UI
```

to:

```
- ✅ Review moderation/approval workflow (pending → approved/rejected) surfaced in UI
```

- [ ] **Step 3: Commit**

```bash
git add COMPLIANCE.md ROADMAP.md
git commit -m "docs: document review moderation compliance posture + tick roadmap"
```

---

## Self-Review

**Spec coverage** (each spec section → task):
- Migration 0005 (enum + columns) → Task 1.
- Seam `toReview` + `setReviewStatus` → Task 2.
- Mock data status → Task 3.
- App `handleSetReviewStatus` + prop → Task 4.
- Status badge / filter / pending pill → Task 5.
- Approve/reject/restore + reason picker + microcopy → Task 6.
- Styles (badges, picker) → Tasks 5 & 6.
- COMPLIANCE.md subsection → Task 8.
- DoD (lint/build/advisors/manual + e2e) → per-task gates + Task 7.

**Type consistency:** `setReviewStatus(reviewId, status, { reason, note })` — same signature in Task 2 (definition), Task 4 (App handler call: `meta` = `{ reason, note }`), Task 6 (`confirmReject` passes `{ reason, note }`). Field names `status` / `rejectReason` / `rejectNote` consistent across `toReview` (Task 2), mock data (Task 3), App optimistic merge (Task 4), and ReviewList reads (Tasks 5-6). `REJECT_REASONS` values (`spam|fake|abusive|off_topic|legal|other`) match the DB enum (Task 1) and the e2e `reason-spam-*` id (Task 7).

**No placeholders:** every code step contains complete code; commands have expected output.

---

## Files touched (summary)

- `supabase/migrations/0005_review_reject_reason.sql` — new (Task 1).
- `src/lib/api.js` — `toReview` + `setReviewStatus` (Task 2).
- `src/utils/mockData.js` — status stamps (Task 3).
- `src/App.jsx` — handler + prop (Task 4).
- `src/components/ReviewList.jsx` — display + actions (Tasks 5-6).
- `src/index.css` — moderation styles (Tasks 5-6).
- `e2e/verify-moderation.mjs` + `package.json` — smoke check (Task 7).
- `COMPLIANCE.md`, `ROADMAP.md` — docs (Task 8).
