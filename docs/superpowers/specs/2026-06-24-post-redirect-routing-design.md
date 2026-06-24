# Post-redirect Routing + Return Notices — Design

**Date:** 2026-06-24
**Status:** Approved (small, single-file fix — this spec doubles as the plan)

---

## Problem

The Stripe and Google edge functions return the browser with intent encoded in
the query string, but the tab-based SPA ignores it, so the user lands on the
default dashboard with no confirmation:

- `stripe-checkout` → `${APP_BASE_URL}/billing?status=success|cancel`
- `google-oauth-callback` → `${APP_BASE_URL}/locations?google=connected|error|badstate|nolocation|norefresh`

(Surfaced during the 2026-06-24 live verification.)

## Goal

On return, route to the relevant tab and show a dismissible confirmation banner.

## Approach (frontend-only — no edge-function change, no redeploy)

All changes are in [src/App.jsx](../../../src/App.jsx) + a few lines of
[src/index.css](../../../src/index.css). The functions already encode intent in
the query; the app reads it.

### Constraint: ESLint `no setState synchronously in an effect body`

(AGENTS.md convention.) So the URL is read via **lazy `useState` initializers**
at first render — not in an effect. `setNotice` only fires from async callbacks
(the auto-dismiss timer) and event handlers (manual close).

### Module-level helpers (top of App.jsx)

```js
function readReturnParams() {
  const p = new URLSearchParams(window.location.search);
  return { status: p.get('status'), google: p.get('google') };
}

const GOOGLE_NOTICES = {
  connected:  { kind: 'success', text: 'Google Business Profile connected.' },
  error:      { kind: 'error',   text: 'Could not connect Google. Please try again.' },
  badstate:   { kind: 'error',   text: 'Google connection failed (invalid request). Please retry.' },
  nolocation: { kind: 'error',   text: 'Google connection failed: location not found.' },
  norefresh:  { kind: 'error',   text: 'Google did not return offline access. Reconnect and allow it.' },
};

function initialTabFromReturn() {
  const { status, google } = readReturnParams();
  if (status) return 'billing';
  if (google) return 'settings';
  return 'dashboard';
}

function initialNoticeFromReturn() {
  const { status, google } = readReturnParams();
  if (status) {
    return status === 'success'
      ? { kind: 'success', text: 'Subscription updated — your plan is now active.' }
      : { kind: 'error', text: 'Checkout canceled — no changes were made.' };
  }
  if (google) return GOOGLE_NOTICES[google] || { kind: 'error', text: 'Google connection failed.' };
  return null;
}
```

### State + effects (in the component)

```js
const [activeTab, setActiveTab] = useState(initialTabFromReturn);   // lazy init reads URL once
const [notice, setNotice] = useState(initialNoticeFromReturn);       // lazy init

// Strip the return query once so a refresh doesn't re-fire it. No setState here.
useEffect(() => {
  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);

// Auto-dismiss the banner. setNotice runs in an async callback (allowed).
useEffect(() => {
  if (!notice) return undefined;
  const t = setTimeout(() => setNotice(null), 6000);
  return () => clearTimeout(t);
}, [notice]);
```

- `activeTab` already exists in App.jsx (default was `'dashboard'`); change its
  declaration to the lazy initializer. `notice` is new.
- Note: tabs only render once past the auth/loading gates. The return is always
  for an already-signed-in user, so by the time the dashboard renders, `activeTab`
  and `notice` are already set — the user sees the right tab + banner.

### Banner (rendered at the top of `.main-content`, above `.header-bar`)

```jsx
{notice && (
  <div className={`return-notice return-notice-${notice.kind}`}>
    <span>{notice.text}</span>
    <button onClick={() => setNotice(null)} aria-label="Dismiss" id="btn-dismiss-notice">×</button>
  </div>
)}
```

### CSS (append to index.css)

A themed banner: success uses the agency/green accent, error uses the red used
elsewhere (`#f87171`); flex row, rounded, with a ✕ button. ~20 lines.

## Edge cases

- **No return params** → `initialTab` = `'dashboard'`, `notice` = `null`: behaves
  exactly as today.
- **Refresh after return** → query already stripped, so no re-trigger.
- **Unknown `google` value** → falls back to a generic error notice.
- **User not signed in on return** (session lost) → they see `Auth`; after sign-in
  the pre-set tab/notice are already in state. Acceptable.

## Testing / Definition of done

No test runner. `npm run lint` → 0 errors (lazy initializers keep us clear of the
synchronous-setState rule), `npm run build` → green, and manual:
`npm run dev`, visit `http://localhost:5173/billing?status=success` (Billing tab +
green banner), `…/billing?status=cancel` (red banner), `…/locations?google=connected`
(Branding Settings tab + green banner), `…/locations?google=norefresh` (settings +
error banner). Confirm the URL query is stripped after load and the banner
auto-dismisses.

## Files

- Modify: `src/App.jsx` (helpers, lazy `activeTab` init, `notice` state, 2 effects, banner).
- Modify: `src/index.css` (`.return-notice` styles).

## Out of scope (YAGNI)

A real toast system, deep-linking arbitrary tabs, changing the edge-function
redirect paths, and the `norefresh` root cause (Google OAuth verification — the
7-day unverified-app token expiry is a separate launch task).
