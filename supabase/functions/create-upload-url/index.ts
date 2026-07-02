// Mints a short-lived signed upload URL for a review video (verify_jwt=false).
//
// The public funnel customer is anonymous, so instead of a blanket anon INSERT
// policy on the bucket (removed in migration 0006), the client asks this
// function for a one-object signed URL and uploads to it. The service role
// authorizes exactly one object per call; nothing else can write the bucket.
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const ALLOWED_EXT = ['mp4', 'webm'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { locationId, ext } = await req.json();
    if (!locationId || !ALLOWED_EXT.includes(String(ext))) {
      return json({ error: 'invalid_input' }, 400);
    }

    // Confirm the location exists so we don't hand out URLs for arbitrary ids.
    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .single();
    if (!loc) return json({ error: 'unknown_location' }, 404);

    // Light rate limit: cap how many videos a single (anonymous) location can
    // accumulate in a short window, so this public endpoint can't be used to
    // flood the public bucket. Per-object size/type are already capped by the
    // bucket config (migration 0002: 50 MB, video/mp4|webm only).
    const since = Date.now() - 10 * 60 * 1000;
    const { data: recent } = await supabaseAdmin.storage
      .from('review-videos')
      .list(locationId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    const recentCount = (recent ?? []).filter(
      (o) => o.created_at && new Date(o.created_at).getTime() >= since,
    ).length;
    if (recentCount >= 20) return json({ error: 'rate_limited' }, 429);

    const path = `${locationId}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabaseAdmin.storage
      .from('review-videos')
      .createSignedUploadUrl(path);
    if (error) throw error;

    return json({ path: data.path, token: data.token });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
