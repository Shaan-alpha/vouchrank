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
