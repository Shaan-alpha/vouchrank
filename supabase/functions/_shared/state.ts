// Signed, time-bound state for OAuth flows.
//
// The Google OAuth `state` round-trips through the browser, so it must be
// tamper-proof: it carries the locationId + userId the callback trusts to
// store credentials and record consent. We HMAC-sign it (SHA-256) and verify
// the signature + freshness on the way back. Without this, state was plain
// base64 and forgeable (an attacker could attach tokens to any location or
// fake the consent_by user).
//
// Key: OAUTH_STATE_SECRET if set, else the service-role key (always present
// server-side). Set a dedicated OAUTH_STATE_SECRET in production.

const enc = new TextEncoder();
const MAX_AGE_MS = 10 * 60 * 1000; // state is valid for 10 minutes

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBuf(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('OAUTH_STATE_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = bufToB64url(enc.encode(JSON.stringify({ ...payload, ts: Date.now() })).buffer as ArrayBuffer);
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body));
  return `${body}.${bufToB64url(sig)}`;
}

// Returns the parsed payload, or null if the signature is invalid/expired/malformed.
export async function verifyState<T = Record<string, unknown>>(state: string): Promise<T | null> {
  const dot = state.lastIndexOf('.');
  if (dot < 1) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(), b64urlToBuf(sig), enc.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBuf(body)));
    if (typeof payload.ts !== 'number' || Date.now() - payload.ts > MAX_AGE_MS) return null;
    return payload as T;
  } catch {
    return null;
  }
}
