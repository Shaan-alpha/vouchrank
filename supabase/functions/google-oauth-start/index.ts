// Returns the Google consent URL for connecting a location's Business Profile.
// The agency user must explicitly grant access (Google requires written consent
// to manage reviews on a client's behalf — we record consent on callback).
import { corsHeaders, json } from '../_shared/cors.ts';
import { getUser, getAgencyForUser } from '../_shared/supabaseAdmin.ts';

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { locationId } = await req.json();
    const member = await getAgencyForUser(user.id);
    if (!member) return json({ error: 'forbidden' }, 403);

    // state ties the callback back to this location + user, signed via Supabase JWT context.
    const state = btoa(JSON.stringify({ locationId, userId: user.id }));

    const params = new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      redirect_uri: Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')!,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent', // force refresh_token issuance
      state,
    });

    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
