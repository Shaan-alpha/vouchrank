// Creates a Stripe Billing Portal session so an agency can manage its existing
// subscription — change plan (with proration), update the payment method, view
// invoices, or cancel. This is the correct path for ANY change once subscribed;
// starting a new Checkout would create a SECOND subscription and double-bill.
// Invoked from the authenticated dashboard: supabase.functions.invoke('stripe-portal')
import Stripe from 'https://esm.sh/stripe@17?target=denonext';
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, getUser, getAgencyForUser } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-04-30.basil' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const member = await getAgencyForUser(user.id);
    if (!member || !['owner', 'admin'].includes(member.role)) return json({ error: 'forbidden' }, 403);

    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('id, stripe_customer_id')
      .eq('id', member.agency_id)
      .single();
    // No Stripe customer yet = never subscribed → nothing to manage.
    if (!agency?.stripe_customer_id) return json({ error: 'no_customer' }, 400);

    const base = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
      customer: agency.stripe_customer_id,
      return_url: `${base}/billing`,
    });

    return json({ url: session.url });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
