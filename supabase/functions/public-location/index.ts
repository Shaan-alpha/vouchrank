// Public read of ONE location's funnel-safe branding (verify_jwt=false).
//
// Replaces the old anon "select * from locations" RLS policy, which exposed
// every tenant's rows. This returns only the non-sensitive fields the public
// review funnel needs to render, for a single location id. CORS is wide-open
// because the funnel can be served from a white-label/custom domain.
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Accept the id from a GET query (CDN-cacheable) or a POST body (functions.invoke).
  let locationId = new URL(req.url).searchParams.get('location');
  if (!locationId && req.method === 'POST') {
    try { locationId = (await req.json())?.location ?? null; } catch { /* no body */ }
  }
  if (!locationId) return json({ error: 'missing_location' }, 400);

  const { data: loc } = await supabaseAdmin
    .from('locations')
    .select('id, name, category, logo_text, colors, google_place_id')
    .eq('id', locationId)
    .single();
  if (!loc) return json({ error: 'unknown_location' }, 404);

  return json(
    {
      id: loc.id,
      name: loc.name,
      category: loc.category,
      logoText: loc.logo_text,
      colors: loc.colors || {},
      googlePlaceId: loc.google_place_id,
    },
    200,
    { 'Cache-Control': 'public, max-age=300' },
  );
});
