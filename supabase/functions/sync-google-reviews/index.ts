// Pulls reviews from the Google Business Profile API (v4) into the reviews table.
// Run on a schedule (Supabase Cron) per connected location, or invoke on demand.
// Reviews API: GET accounts/{accountId}/locations/{locationId}/reviews (300 qpm).
import { json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

async function freshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
    }),
  });
  const t = await res.json();
  return t.access_token;
}

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const sentimentOf = (n: number) => (n >= 4 ? 'positive' : n === 3 ? 'neutral' : 'negative');

Deno.serve(async (req) => {
  try {
    const { locationId } = await req.json();

    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id, agency_id, google_account_id')
      .eq('id', locationId)
      .single();
    if (!loc?.google_account_id) return json({ error: 'location_not_connected' }, 400);

    const { data: cred } = await supabaseAdmin
      .from('location_google_credentials')
      .select('refresh_token')
      .eq('location_id', locationId)
      .single();
    if (!cred) return json({ error: 'no_credentials' }, 400);

    const accessToken = await freshAccessToken(cred.refresh_token);

    // google_account_id stores "accounts/123/locations/456"
    const apiUrl = `https://mybusiness.googleapis.com/v4/${loc.google_account_id}/reviews`;
    const gRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!gRes.ok) return json({ error: 'google_api_error', detail: await gRes.text() }, 502);
    const { reviews = [] } = await gRes.json();

    const rows = reviews.map((r: Record<string, unknown>) => {
      const rating = STAR_MAP[r.starRating as string] ?? 3;
      return {
        location_id: locationId,
        agency_id: loc.agency_id,
        external_id: r.reviewId,
        author: (r.reviewer as { displayName?: string })?.displayName ?? 'Google User',
        rating,
        source: 'google',
        sentiment: sentimentOf(rating),
        status: 'approved',
        is_public: true,
        text: (r.comment as string) ?? '',
        created_at: r.createTime,
      };
    });

    if (rows.length) {
      // upsert on (location_id, external_id) — see unique constraint in migration
      await supabaseAdmin.from('reviews').upsert(rows, { onConflict: 'location_id,external_id' });
    }

    return json({ synced: rows.length });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
