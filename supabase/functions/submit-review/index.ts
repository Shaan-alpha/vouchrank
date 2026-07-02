// Public endpoint the customer review funnel posts to (verify_jwt=false).
// Validates input, applies a light per-location rate limit, and inserts the
// review server-side (service_role) — the browser never gets direct table
// access. Compliant: low ratings are stored, never suppressed or rerouted.
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const VALID_SOURCES = ['google', 'video', 'manual', 'private'];
const sentimentOf = (n: number) => (n >= 4 ? 'positive' : n === 3 ? 'neutral' : 'negative');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const locationId = body.locationId ?? body.companyId;
    const rating = Number(body.rating);
    const source = String(body.source ?? 'manual').toLowerCase();

    if (!locationId || !(rating >= 1 && rating <= 5) || !VALID_SOURCES.includes(source)) {
      return json({ error: 'invalid_input' }, 400);
    }

    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id, agency_id')
      .eq('id', locationId)
      .single();
    if (!loc) return json({ error: 'unknown_location' }, 404);

    // Light rate limit: max 20 submissions / location / 10 min
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .gte('created_at', since);
    if ((count ?? 0) >= 20) return json({ error: 'rate_limited' }, 429);

    const isPrivate = source === 'private';
    const text = String(body.text ?? '').slice(0, 4000);

    // Anti-spam (authenticity, not sentiment): drop obvious link-farm spam on
    // PUBLIC submissions before it can render in the embeddable widget. Private
    // feedback isn't displayed, so it's exempt. Deliberately conservative
    // (3+ links) to avoid suppressing legitimate reviews — pair with a funnel
    // CAPTCHA / per-IP limit for real scale. Never keys off rating or sentiment.
    if (!isPrivate && (text.match(/https?:\/\/|www\./gi) || []).length >= 3) {
      return json({ error: 'spam_suspected' }, 422);
    }

    const { error } = await supabaseAdmin.from('reviews').insert({
      location_id: loc.id,
      agency_id: loc.agency_id,
      author: String(body.author ?? 'Anonymous Customer').slice(0, 120),
      avatar: body.avatar ? String(body.avatar).slice(0, 200) : null,
      rating,
      source,
      sentiment: sentimentOf(rating),
      status: 'pending',                 // manual/video reviews await agency approval
      is_public: !isPrivate,
      text,
      keywords: Array.isArray(body.keywords)
        ? body.keywords.slice(0, 20).map((k: unknown) => String(k).slice(0, 40))
        : [],
      video_url: body.videoUrl ?? null,
    });
    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
