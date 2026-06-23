// Public read endpoint for the embeddable widget (verify_jwt=false). Returns a
// location's branding + its public, non-rejected reviews so widget.js can render
// social proof on any third-party site.
//
// CORS is wide-open (Allow-Origin: *) because the widget runs on arbitrary client
// domains — it intentionally does NOT use ../_shared/cors.ts (which locks to
// APP_BASE_URL in production).
//
// Compliant: reviews of ANY rating are returned (no score-based filtering). Only
// is_public reviews that have not been explicitly rejected are included.
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const widgetCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...widgetCors, 'Content-Type': 'application/json', ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: widgetCors });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get('location');
    if (!locationId) return json({ error: 'missing_location' }, 400);

    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id, name, logo_text, colors')
      .eq('id', locationId)
      .single();
    if (!loc) return json({ error: 'unknown_location' }, 404);

    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select('id, author, avatar, rating, source, text, video_url, created_at')
      .eq('location_id', locationId)
      .eq('is_public', true)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(24);
    if (error) throw error;

    return json(
      {
        location: { name: loc.name, logoText: loc.logo_text, colors: loc.colors || {} },
        reviews: (reviews || []).map((r) => ({
          id: r.id,
          author: r.author,
          avatar: r.avatar,
          rating: r.rating,
          source: r.source,
          text: r.text,
          videoUrl: r.video_url,
          created_at: r.created_at,
        })),
      },
      200,
      { 'Cache-Control': 'public, max-age=300' },
    );
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
