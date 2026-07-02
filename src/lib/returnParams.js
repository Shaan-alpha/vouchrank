// Pure helpers for post-redirect return handling.
//
// Stripe checkout returns the browser to `/billing?status=success|cancel`; the
// Google OAuth callback returns to `/locations?google=connected|error|…`. These
// map that query intent to a dashboard tab + a banner notice. Kept dependency-
// free (only `window.location` + `URLSearchParams`) so the mapping is unit-testable.

export function readReturnParams(search = window.location.search) {
  const p = new URLSearchParams(search);
  return { status: p.get('status'), google: p.get('google') };
}

export const GOOGLE_NOTICES = {
  connected: { kind: 'success', text: 'Google Business Profile connected.' },
  error: { kind: 'error', text: 'Could not connect Google. Please try again.' },
  badstate: { kind: 'error', text: 'Google connection failed (invalid request). Please retry.' },
  nolocation: { kind: 'error', text: 'Google connection failed: location not found.' },
  forbidden: { kind: 'error', text: 'Google connection failed: you no longer have access to this location.' },
  norefresh: { kind: 'error', text: 'Google did not return offline access. Reconnect and allow it.' },
};

// Which tab to land on for a given return, defaulting to the dashboard.
export function initialTabFromReturn(search = window.location.search) {
  const { status, google } = readReturnParams(search);
  if (status) return 'billing';
  if (google) return 'settings';
  return 'dashboard';
}

// The banner notice ({ kind, text }) for a given return, or null when none.
export function initialNoticeFromReturn(search = window.location.search) {
  const { status, google } = readReturnParams(search);
  if (status) {
    return status === 'success'
      ? { kind: 'success', text: 'Subscription updated — your plan is now active.' }
      : { kind: 'error', text: 'Checkout canceled — no changes were made.' };
  }
  if (google) return GOOGLE_NOTICES[google] || { kind: 'error', text: 'Google connection failed.' };
  return null;
}
