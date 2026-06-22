# Location Management CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agency add, edit, and delete the locations it manages via a modal opened from the tenant selector, working in both demo (in-memory) and live (Postgres/RLS) mode.

**Architecture:** Components never touch `supabase` directly — `App.jsx` owns optimistic UI state and calls the `src/lib/api.js` seam (mirroring the existing `handleAddReviewReply` → `saveReviewReply` pattern). A new self-contained `LocationsManager.jsx` modal renders the list/add/edit/delete UI and receives data + callbacks as props. Deleting the last location routes to the existing `FirstLocation` onboarding empty state.

**Tech Stack:** React 19 (no `import React`; hooks only), Vite 8, lucide-react, plain CSS in `src/index.css` + inline styles. Supabase JS for live mode.

## Global Constraints

- **No test runner exists** (package.json scripts: `dev`, `build`, `lint`, `preview`). Per AGENTS.md, "definition of done" = `npm run lint` → **0 errors** and `npm run build` → **green**, plus the manual check named in each task. Do **not** add a test framework.
- **React 19 JSX transform:** do **not** `import React`. Import only the hooks/icons you use (ESLint flags unused identifiers).
- **Icons:** `lucide-react` only; import just what's used. Verified to exist: `Building2, Plus, Pencil, Trash2, X, Check, AlertTriangle, ArrowLeft`.
- **Data-layer seam:** all DB access goes through `src/lib/api.js`. Never call `supabase` from a component.
- **No `setState` synchronously in an effect body** (ESLint rule). Reset state in event handlers / async callbacks.
- **Interactive elements get an `id`** (e.g. `id="btn-add-location"`) for testing.
- **Compliance (guardrail #1):** never touch the review funnel, sentiment, or routing. This feature does not go near them.
- **Commit** after each task with the message shown. We are on branch `feature/location-management-crud`.

---

### Task 1: Data seam — `createLocation` (demo), `updateLocation`, `deleteLocation`

**Files:**
- Modify: `src/lib/api.js` (the `createLocation` function, ~lines 69-86; add two new functions after it)

**Interfaces:**
- Consumes: existing `toCompany(loc)` mapper, `demoMode` flag, `supabase`, `getAgency()`.
- Produces:
  - `createLocation({ name, category }): Promise<Company>` — now returns a constructed `Company` object in demo mode (never `null`).
  - `updateLocation(id, fields): Promise<{demo:true} | Company>` where `fields` may contain `name`, `category`, `domain`.
  - `deleteLocation(id): Promise<{demo:true} | {ok:true}>`.
  - `Company` shape = the object returned by `toCompany`: `{ id, name, category, domain, logoText, colors, googlePlaceId, aioVisibility, googleRating, googleCount, videoCount }`.

- [ ] **Step 1: Replace the demo branch of `createLocation`**

In `src/lib/api.js`, change the `createLocation` function's demo guard from `if (demoMode) return null;` to return a constructed company so demo add + demo onboarding work. The full function becomes:

```js
// Creates the first (or another) location for the signed-in user's agency.
// In demo mode there is no DB, so we synthesize a company object that matches
// the toCompany() shape; App.jsx appends it to local state.
export async function createLocation({ name, category }) {
  if (demoMode) {
    return {
      id: `loc-${Date.now()}`,
      name,
      category: category || 'Local Business',
      domain: null,
      logoText: name.slice(0, 2).toUpperCase(),
      colors: { primary: '#8b5cf6', secondary: '#06b6d4' },
      googlePlaceId: null,
      aioVisibility: 0,
      googleRating: null,
      googleCount: 0,
      videoCount: 0,
    };
  }
  const agency = await getAgency();
  const { data, error } = await supabase
    .from('locations')
    .insert({
      agency_id: agency.id,
      name,
      category: category || 'Local Business',
      logo_text: name.slice(0, 2).toUpperCase(),
      colors: { primary: '#8b5cf6', secondary: '#06b6d4' },
    })
    .select('*')
    .single();
  if (error) throw error;
  return toCompany(data);
}
```

- [ ] **Step 2: Add `updateLocation` and `deleteLocation` immediately after `createLocation`**

```js
// Updates editable identity fields on a location (name / category / domain).
// Demo mode is a no-op (App merges optimistically); live mode persists and
// returns the updated row mapped to the UI shape.
export async function updateLocation(id, fields) {
  if (demoMode) return { demo: true };
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.category !== undefined) patch.category = fields.category;
  if (fields.domain !== undefined) patch.domain = fields.domain;
  const { data, error } = await supabase
    .from('locations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toCompany(data);
}

// Permanently deletes a location. The FK `on delete cascade` chain removes its
// reviews, audits, queries, checklist, competitors, campaigns, and google
// credentials. Demo mode is a no-op (App removes it from local state).
export async function deleteLocation(id) {
  if (demoMode) return { demo: true };
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors (no unused vars; `getAgency`/`toCompany`/`demoMode`/`supabase` all already in scope).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: green (exits 0, "built in …").

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.js
git commit -m "feat(api): add updateLocation/deleteLocation; demo createLocation returns a company"
```

---

### Task 2: `LocationsManager` modal component + styles

**Files:**
- Create: `src/components/LocationsManager.jsx`
- Modify: `src/index.css` (append a "Locations manager modal" block at end of file)

**Interfaces:**
- Consumes (props): `companies: Company[]`, `selectedId: string`, `maxLocations: number`, `onAdd({name,category}): Promise`, `onUpdate(id,{name,category,domain}): Promise`, `onDelete(id): Promise`, `onSelect(id): void`, `onClose(): void`.
- Produces: default-exported `LocationsManager` React component. Not yet imported anywhere (wired in Task 3).

- [ ] **Step 1: Create `src/components/LocationsManager.jsx`**

```jsx
import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

const BLANK = { name: '', category: '', domain: '' };

// Agency-level modal to manage the set of locations (client businesses).
// Pure presentational: all persistence happens via the callbacks from App.jsx.
export default function LocationsManager({
  companies,
  selectedId,
  maxLocations,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
  onClose,
}) {
  const [mode, setMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const atCap = companies.length >= maxLocations;

  const startAdd = () => {
    setForm(BLANK);
    setError('');
    setMode('add');
  };

  const startEdit = (c) => {
    setForm({ name: c.name || '', category: c.category || '', domain: c.domain || '' });
    setEditingId(c.id);
    setError('');
    setMode('edit');
  };

  const backToList = () => {
    setMode('list');
    setEditingId(null);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Business name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'add') {
        await onAdd({ name, category: form.category.trim() });
        onClose();
      } else {
        await onUpdate(editingId, {
          name,
          category: form.category.trim(),
          domain: form.domain.trim() || null,
        });
        backToList();
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (id) => {
    setBusy(true);
    setError('');
    try {
      await onDelete(id);
      setConfirmingDeleteId(null);
    } catch (err) {
      setError(err.message || 'Could not delete location.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="locations-modal-overlay" onClick={onClose}>
      <div className="harvester-card locations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="locations-modal-header">
          <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
            <Building2 style={{ width: 18 }} /> Manage locations
          </h3>
          <button className="locations-icon-btn" onClick={onClose} aria-label="Close" id="btn-close-locations">
            <X style={{ width: 18 }} />
          </button>
        </div>

        {mode === 'list' && (
          <>
            <div className="locations-list">
              {companies.map((c) => (
                <div className="location-row" key={c.id}>
                  {confirmingDeleteId === c.id ? (
                    <div className="location-confirm">
                      <span style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <AlertTriangle style={{ width: 14, color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
                        <span>
                          Delete <strong>{c.name}</strong>? This permanently removes its reviews,
                          audits, competitors, and campaigns. This can&apos;t be undone.
                        </span>
                      </span>
                      <div className="location-row-actions">
                        <button className="locations-icon-btn" onClick={() => setConfirmingDeleteId(null)} disabled={busy}>
                          Cancel
                        </button>
                        <button
                          className="locations-icon-btn locations-danger"
                          onClick={() => confirmDelete(c.id)}
                          disabled={busy}
                          id={`btn-confirm-delete-${c.id}`}
                        >
                          {busy ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="location-row-main"
                        onClick={() => {
                          onSelect(c.id);
                          onClose();
                        }}
                      >
                        <span className="location-name">
                          {c.name}
                          {c.id === selectedId && <span className="location-current-badge">Current</span>}
                        </span>
                        <span className="location-meta">{c.category || 'Local Business'}</span>
                      </button>
                      <div className="location-row-actions">
                        <button
                          className="locations-icon-btn"
                          onClick={() => startEdit(c)}
                          aria-label={`Edit ${c.name}`}
                          id={`btn-edit-location-${c.id}`}
                        >
                          <Pencil style={{ width: 15 }} />
                        </button>
                        <button
                          className="locations-icon-btn locations-danger"
                          onClick={() => setConfirmingDeleteId(c.id)}
                          aria-label={`Delete ${c.name}`}
                          id={`btn-delete-location-${c.id}`}
                        >
                          <Trash2 style={{ width: 15 }} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="locations-error">{error}</p>}

            <button
              className="btn-primary-action"
              style={{ width: '100%', marginTop: 12 }}
              onClick={startAdd}
              disabled={atCap}
              id="btn-add-location"
            >
              <Plus style={{ width: 16 }} />
              Add location
            </button>
            {atCap && (
              <p className="locations-hint">
                Plan limit reached ({companies.length}/{maxLocations}) — upgrade to add more.
              </p>
            )}
          </>
        )}

        {(mode === 'add' || mode === 'edit') && (
          <form onSubmit={submit}>
            <div className="input-field-group">
              <label>Business Name</label>
              <input
                className="input-control"
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Austin Dental Care"
                id="input-location-name"
              />
            </div>
            <div className="input-field-group">
              <label>Category</label>
              <input
                className="input-control"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Dentist / Healthcare"
                id="input-location-category"
              />
            </div>
            {mode === 'edit' && (
              <div className="input-field-group">
                <label>Domain</label>
                <input
                  className="input-control"
                  value={form.domain}
                  onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  placeholder="austindental.com"
                  id="input-location-domain"
                />
              </div>
            )}

            {error && <p className="locations-error">{error}</p>}

            <div className="locations-form-actions">
              <button type="button" className="locations-icon-btn" onClick={backToList} disabled={busy}>
                <ArrowLeft style={{ width: 15 }} /> Cancel
              </button>
              <button type="submit" className="btn-primary-action" disabled={busy} id="btn-save-location">
                <Check style={{ width: 16 }} />
                {busy ? 'Saving…' : mode === 'add' ? 'Create location' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append the modal styles to `src/index.css`**

Add at the end of the file:

```css
/* =====================================================================
   Locations manager modal
   ===================================================================== */
.locations-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 4, 8, 0.7);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 10000;
  padding: 20px;
}
.locations-modal {
  max-width: 460px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
}
.locations-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.locations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.location-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.location-row-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  padding: 0;
}
.location-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}
.location-meta {
  font-size: 12px;
  color: var(--text-secondary);
}
.location-current-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--agency-primary);
  color: #fff;
}
.location-row-actions {
  display: flex;
  gap: 4px;
}
.locations-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
.locations-icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.locations-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.locations-danger {
  color: #f87171;
}
.locations-danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
}
.location-confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
  width: 100%;
}
.locations-form-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
}
.locations-error {
  color: #f87171;
  font-size: 12px;
  margin: 8px 0 0;
}
.locations-hint {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 8px 0 0;
  text-align: center;
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors (all imported icons are used; no `import React`; no unused vars).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: green. (Note: this file is not yet imported by the entry graph, so the build proves the rest still compiles; the component itself is exercised in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/components/LocationsManager.jsx src/index.css
git commit -m "feat(ui): add LocationsManager modal component + styles"
```

---

### Task 3: Wire the modal into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `api.createLocation`, `api.updateLocation`, `api.deleteLocation`, `api.getAgency` (all from Task 1 / existing); `LocationsManager` (Task 2).
- Produces: a working Manage-locations flow reachable from the header.

- [ ] **Step 1: Add the `LocationsManager` import**

After the existing `import FirstLocation from './components/FirstLocation';` line, add:

```jsx
import LocationsManager from './components/LocationsManager';
```

- [ ] **Step 2: Add new state**

In the `Data` state block (after `const [campaignData, setCampaignData] = useState(null);`), add:

```jsx
  const [agency, setAgency] = useState(null);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
```

- [ ] **Step 3: Load the agency alongside companies**

In the "Load companies once authed" effect, add an agency fetch so the modal knows the plan cap. The effect body becomes:

```jsx
  useEffect(() => {
    if (isSupabaseConfigured && !session) return;
    api.getCompanies().then((list) => {
      setCompanies(list);
      setSelectedCompany((prev) => prev || list[0] || null);
      setCompaniesLoaded(true);
    });
    api.getAgency().then(setAgency).catch(() => {});
  }, [session]);
```

- [ ] **Step 4: Add a `clearTenantData` helper and refactor `handleCompanyChange` to use it**

Replace the existing `handleCompanyChange` function with:

```jsx
  // Clears stale per-location data so keyed children remount fresh once the
  // newly selected (or created) location loads.
  const clearTenantData = () => {
    setReviews([]);
    setCompanyAudit(null);
    setCompetitors([]);
    setCampaignData(null);
  };

  const handleCompanyChange = (e) => {
    const comp = companies.find((c) => c.id === e.target.value);
    if (comp) {
      clearTenantData();
      setSelectedCompany(comp);
    }
  };

  const handleSelectLocation = (id) => {
    const comp = companies.find((c) => c.id === id);
    if (comp && comp.id !== selectedCompany?.id) {
      clearTenantData();
      setSelectedCompany(comp);
    }
  };
```

- [ ] **Step 5: Add the three CRUD handlers**

Place these right after the existing `handleCreateLocation` function:

```jsx
  const handleAddLocation = async ({ name, category }) => {
    const loc = await api.createLocation({ name, category });
    if (!loc) return;
    setCompanies((prev) => [...prev, loc]);
    clearTenantData();
    setSelectedCompany(loc);
  };

  const handleUpdateLocation = async (id, fields) => {
    const ui = {};
    if (fields.name !== undefined) ui.name = fields.name;
    if (fields.category !== undefined) ui.category = fields.category;
    if (fields.domain !== undefined) ui.domain = fields.domain;
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...ui } : c)));
    setSelectedCompany((prev) => (prev && prev.id === id ? { ...prev, ...ui } : prev));
    await api.updateLocation(id, fields).catch(() => {});
  };

  const handleDeleteLocation = async (id) => {
    const next = companies.filter((c) => c.id !== id);
    setCompanies(next);
    if (selectedCompany && selectedCompany.id === id) {
      clearTenantData();
      setSelectedCompany(next[0] || null);
    }
    if (next.length === 0) setShowLocationsModal(false); // avoid re-opening over onboarding
    await api.deleteLocation(id).catch(() => {});
  };
```

- [ ] **Step 6: Relax the empty-state gate to cover demo mode**

Find the `if (!selectedCompany)` gate and change its inner condition from `isSupabaseConfigured && companiesLoaded && companies.length === 0` to drop the `isSupabaseConfigured &&` part, so deleting the last location in demo mode also routes to onboarding:

```jsx
  if (!selectedCompany) {
    if (companiesLoaded && companies.length === 0) {
      return <FirstLocation onCreate={handleCreateLocation} />;
    }
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030408', color: '#fff' }}>Setting up your workspace…</div>;
  }
```

- [ ] **Step 7: Add the "Manage" button next to the tenant selector**

In the header, replace the tenant-selector `<div>` (the one containing `Building2` + `select.tenant-selector`) with this version that adds a Manage button:

```jsx
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 style={{ color: 'var(--text-secondary)', width: '18px' }} />
                <select className="tenant-selector" value={selectedCompany.id} onChange={handleCompanyChange} id="select-tenant-location">
                  {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <button className="locations-icon-btn" onClick={() => setShowLocationsModal(true)} id="btn-manage-locations">
                  Manage
                </button>
              </div>
```

- [ ] **Step 8: Render the modal**

Immediately after the closing `</main>` tag (inside the `app-container` div), add:

```jsx
          {showLocationsModal && (
            <LocationsManager
              companies={companies}
              selectedId={selectedCompany.id}
              maxLocations={agency?.max_locations ?? 15}
              onAdd={handleAddLocation}
              onUpdate={handleUpdateLocation}
              onDelete={handleDeleteLocation}
              onSelect={handleSelectLocation}
              onClose={() => setShowLocationsModal(false)}
            />
          )}
```

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: 0 errors. (`agency` is read via `agency?.max_locations`; `Building2` already imported; all new handlers are used.)

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: green.

- [ ] **Step 11: Manual verification (demo mode)**

Run: `npm run dev`, open http://localhost:5173, and verify the full flow:
1. Click **Manage** next to the tenant dropdown → modal opens listing demo locations, "Current" badge on the active one.
2. **Add:** click **Add location**, enter a name → list/header now show it and it's selected. Dashboard/campaign tabs show empty states without crashing.
3. **Edit:** open a location's pencil → change category + domain → Save → the row and header reflect the change.
4. **Delete (non-selected):** trash a non-active location → inline confirm appears → Delete → row disappears, app stays put.
5. **Delete (selected):** trash the active location (with others present) → selection moves to another location, modal stays open.
6. **Delete to zero:** delete remaining locations → app routes to the "Add your first location" onboarding; creating one returns to the dashboard (and the Manage modal does not auto-reopen).
7. **Plan cap:** with `agency.max_locations` (15 in demo), if you reach the cap the **Add location** button is disabled with the limit hint. (To eyeball quickly, you can temporarily lower the cap, but do not commit that change.)

- [ ] **Step 12: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire location management modal into the app shell"
```

---

## Self-Review

**1. Spec coverage:**
- "Add/edit/delete locations from inside the app" → Tasks 1-3. ✓
- "Works in demo + live mode" → Task 1 demo branches + live SQL; Task 3 optimistic state. ✓
- "Manage modal from tenant selector" → Task 3 Step 7-8. ✓
- "Full CRUD in demo" → Task 1 `createLocation` demo return + Task 3 local-state mutations. ✓
- "Inline styled delete confirm (not native)" → Task 2 `confirmingDeleteId` view. ✓
- "Last-location delete routes to onboarding" → Task 3 Step 6 (relaxed gate) + Step 5 (`setShowLocationsModal(false)`). ✓
- "Plan cap app-side" → Task 2 `atCap` + Task 3 `maxLocations` prop. ✓
- "Branding stays in BrandingSettings (no color/logo edit here)" → Task 2 form has only name/category/domain. ✓
- "Compliance untouched" → no funnel/sentiment code referenced. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"add validation" — every step has concrete code or an exact command + expected output. ✓

**3. Type consistency:** `Company` shape from `toCompany` is used consistently; demo `createLocation` returns the same keys. `onUpdate(id, fields)` with `{name,category,domain}` matches `api.updateLocation(id, fields)` mapping. `handleSelectLocation` (App) ↔ `onSelect` (component) wired in Step 8. `agency.max_locations` (snake_case from `getAgency`) ↔ `maxLocations` prop. ✓
