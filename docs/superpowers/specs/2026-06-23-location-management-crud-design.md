# Location Management CRUD — Design

**Date:** 2026-06-23
**Status:** Approved (pending spec review)
**Roadmap item:** Phase 2 — "Location management CRUD (add/edit/remove beyond first-location onboarding)"

---

## Goal

Let an agency add, edit, and delete the locations (client businesses) it manages
from inside the app — not just the single location created during onboarding.
Behaves identically in **demo mode** (in-memory React state) and **live mode**
(Postgres via RLS), consistent with the project's "fully clickable with zero
setup" demo philosophy.

## Non-goals (YAGNI)

- Bulk actions / multi-select.
- Soft-delete / archive / restore (delete is a hard, cascading delete).
- Editing colors / logo here — `BrandingSettings` owns per-location theming.
- Per-location Google reconnection flows.
- A database-level `max_locations` enforcement trigger (deferred; see "Plan cap").

---

## Architecture

The feature follows the existing seam: components never touch `supabase`
directly (guardrail #5). `App.jsx` owns optimistic UI state and calls
`src/lib/api.js`, mirroring the existing `handleAddReviewReply` →
`saveReviewReply` pattern.

- **Data seam** — [src/lib/api.js](../../../src/lib/api.js): two new functions
  (`updateLocation`, `deleteLocation`) and one tweak (`createLocation` returns a
  constructed company in demo mode instead of `null`).
- **New component** — [src/components/LocationsManager.jsx](../../../src/components/LocationsManager.jsx):
  a self-contained modal that receives data + callbacks as props.
- **Shell wiring** — [src/App.jsx](../../../src/App.jsx): a "Manage" button beside
  the tenant selector opens the modal; three handlers own state transitions.
- **Styles** — [src/index.css](../../../src/index.css): a modal overlay (mirroring
  the existing `.video-popup-overlay`) plus a compact location-row style.

---

## Data seam: `src/lib/api.js`

UI ⇄ DB column mapping reuses the existing `toCompany()` mapper. Editable fields
are `name`, `category`, `domain` (UI) → `name`, `category`, `domain` (columns).

| Function | Live mode | Demo mode |
|---|---|---|
| `createLocation({ name, category })` *(modify)* | unchanged: insert row, return `toCompany(row)` | **return a constructed company object** — `{ id: 'loc-' + Date.now(), name, category, logoText: name.slice(0,2).toUpperCase(), colors: { primary:'#8b5cf6', secondary:'#06b6d4' }, googleRating:null, googleCount:0, videoCount:0, aioVisibility:0 }` — instead of `null`, so demo add + demo onboarding work |
| `updateLocation(id, fields)` *(new)* | `update locations set {name,category,domain} where id=…`, return `toCompany(row)` | no-op returning `{ demo:true }`; App merges optimistically |
| `deleteLocation(id)` *(new)* | `delete from locations where id=…` (FK `on delete cascade` removes reviews, audits, queries, checklist, competitors, campaigns, google creds) | no-op returning `{ demo:true }`; App removes from state |

RLS already permits these: `locations_write` grants `member`+ INSERT/UPDATE/DELETE
within the agency. No migration required.

---

## Component: `src/components/LocationsManager.jsx`

A modal rendered by `App.jsx` when `showLocationsModal` is true.

**Props**

- `companies` — array of company objects (current locations).
- `selectedId` — id of the active location (for the "current" badge).
- `maxLocations` — plan cap from `agency.max_locations`.
- `onAdd(fields)` — async; resolves to the created company.
- `onUpdate(id, fields)` — async; persists edits.
- `onDelete(id)` — async; removes the location.
- `onSelect(id)` — switch the active tenant from within the modal.
- `onClose()` — dismiss the modal.

**Internal state:** `mode` (`'list' | 'add' | 'edit'`), `editing` (location being
edited), form fields (`name`, `category`, `domain`), `confirmingDeleteId`,
`busy`, `error`.

**Views**

- **List** — one row per location: name, category, a "Current" badge on the
  selected one. Row actions: **Edit**, **Delete**, and click-to-select (calls
  `onSelect` + `onClose`). Header shows **+ Add location**, disabled at the cap
  with hint *"Plan limit reached (N/N) — upgrade to add more."*
- **Add / Edit form** — `name` (required, trimmed), `category`, `domain`.
  Save / Cancel; `busy` disables Save; `error` shows inline. On add success:
  the new location becomes selected and the modal closes. On edit success:
  return to list view.
- **Inline delete confirm** — clicking Delete swaps that row into a confirm
  state (not the native `window.confirm`): *"Delete '{name}'? This permanently
  removes its reviews, audits, competitors, and campaigns. This can't be
  undone."* with **Cancel** / **Delete** buttons. Keeps the dark glass theme.

**Styling** — overlay mirrors `.video-popup-overlay`; content reuses
`.harvester-card`, `.input-field-group`, `.input-control`, `.btn-primary-action`.
New CSS limited to the overlay container and a `.location-row` fl/row style.

---

## Shell wiring: `src/App.jsx`

**New state**

- `showLocationsModal` (bool).
- `agency` (object) — loaded via `api.getAgency()` so the modal knows
  `max_locations`. Loaded in the same effect that loads companies (demo returns
  `{ …, max_locations: 15 }`).

**Header** — a **Manage** button (lucide `Building2` or `Settings2`) next to the
existing `select.tenant-selector`, `id="btn-manage-locations"`.

**Handlers**

- `handleAddLocation({ name, category })` → `const loc = await api.createLocation(...)`;
  `setCompanies(prev => [...prev, loc])`; select `loc`; close modal.
- `handleUpdateLocation(id, fields)` → optimistic `setCompanies` merge; if `id`
  is the active location, `setSelectedCompany(prev => ({ ...prev, ...fields }))`;
  then `api.updateLocation(id, fields).catch(() => {})`.
- `handleDeleteLocation(id)` → `setCompanies(prev => prev.filter(c => c.id !== id))`;
  if `id` was selected, reselect `remaining[0] || null` and clear stale
  per-location data (reuse the clearing logic from `handleCompanyChange`);
  then `api.deleteLocation(id).catch(() => {})`.

---

## Edge cases & decisions

- **Deleting the last location** is allowed and routes to the onboarding empty
  state rather than being blocked. After deletion `selectedCompany` becomes
  `null`; the App gate shows `FirstLocation` so the user immediately creates a
  replacement. The gate is relaxed to trigger on `companiesLoaded &&
  companies.length === 0` in **both** demo and live mode (today it's live-only),
  and demo `createLocation` now returns a real object so demo onboarding works.
  This is better UX than a hard "you can't delete this" block.
- **Plan cap** (`agencies.max_locations`, default 15) is enforced **app-side** in
  the modal (disabled Add + hint), consistent with AGENTS.md ("per-plan caps
  enforced in app"). The schema comment claims a DB-level check exists, but no
  trigger is present; adding one is deferred future hardening with no UX impact.
- **Optimistic writes** follow the existing pattern: update React state first,
  persist via api with `.catch(() => {})`. Live-mode failures are non-fatal to
  the UI (acceptable at this stage; surfacing write errors is a separate
  observability roadmap item).
- **Compliance** — untouched. This feature never reaches the review funnel,
  sentiment, or routing logic (guardrail #1).
- **Tenant isolation** — all writes go through RLS-scoped api calls; no
  `agency_id` is set client-side on update/delete (the row already carries it).

---

## Testing / Definition of done

No test runner exists in this repo (scripts: dev/build/lint/preview), so
verification is:

- `npm run lint` → 0 errors.
- `npm run build` → green.
- Manual click-through in **demo mode**: add a location (lands on it), edit a
  location (name/category/domain persist in the list and header), delete a
  non-selected location, delete the *selected* location (reselects another),
  delete down to zero (lands on onboarding, can re-create), hit the plan cap
  (Add disabled with hint).

---

## Files touched

- `src/lib/api.js` — modify `createLocation`; add `updateLocation`, `deleteLocation`.
- `src/components/LocationsManager.jsx` — new modal component.
- `src/App.jsx` — agency load, Manage button, three handlers, relaxed empty-state gate.
- `src/index.css` — modal overlay + location-row styles.
