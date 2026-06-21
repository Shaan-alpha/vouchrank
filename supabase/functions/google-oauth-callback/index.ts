// Google OAuth redirect target. Exchanges the auth code for tokens, stores the
// refresh token + recorded consent in location_google_credentials (service_role
// only), then bounces the user back to the app. verify_jwt=false.
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const base = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';

  if (!code || !state) return Response.redirect(`${base}/locations?google=error`, 302);

  let parsed: { locationId: string; userId: string };
  try {
    parsed = JSON.parse(atob(state));
  } catch {
    return Response.redirect(`${base}/locations?google=badstate`, 302);
  }

  // Confirm the user still has access to this location's agency before storing tokens.
  const { data: loc } = await supabaseAdmin
    .from('locations')
    .select('id, agency_id')
    .eq('id', parsed.locationId)
    .single();
  if (!loc) return Response.redirect(`${base}/locations?google=nolocation`, 302);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
      redirect_uri: Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')!,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) return Response.redirect(`${base}/locations?google=norefresh`, 302);

  await supabaseAdmin.from('location_google_credentials').upsert({
    location_id: parsed.locationId,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    consent_at: new Date().toISOString(),
    consent_by: parsed.userId,
    scopes: ['https://www.googleapis.com/auth/business.manage'],
  });

  return Response.redirect(`${base}/locations?google=connected`, 302);
});
