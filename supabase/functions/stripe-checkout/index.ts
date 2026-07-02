// Creates a Stripe Checkout session for an agency subscription.
// Invoked from the authenticated dashboard: supabase.functions.invoke('stripe-checkout', { body: { plan } })
import Stripe from 'https://esm.sh/stripe@17?target=denonext';
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, getUser, getAgencyForUser } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-04-30.basil' });

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  agency: Deno.env.get('STRIPE_PRICE_AGENCY'),
  agency_pro: Deno.env.get('STRIPE_PRICE_AGENCY_PRO'),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { plan } = await req.json();
    const price = PRICE_BY_PLAN[plan];
    if (!price) return json({ error: 'invalid_plan' }, 400);

    const member = await getAgencyForUser(user.id);
    if (!member || !['owner', 'admin'].includes(member.role)) return json({ error: 'forbidden' }, 403);

    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('id, name, stripe_customer_id, stripe_subscription_id, plan_status')
      .eq('id', member.agency_id)
      .single();

    // Block starting a second subscription when one is already live — plan
    // changes must go through the billing portal (stripe-portal), which updates
    // the existing subscription with proration. (A canceled sub leaves the id
    // set but plan_status = canceled, so re-subscribing is still allowed.)
    if (agency?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(agency.plan_status ?? '')) {
      return json({ error: 'already_subscribed' }, 409);
    }

    // Reuse or create the Stripe customer
    let customerId = agency?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: agency?.name,
        metadata: { agency_id: agency!.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('agencies').update({ stripe_customer_id: customerId }).eq('id', agency!.id);
    }

    const base = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/billing?status=success`,
      cancel_url: `${base}/billing?status=cancel`,
      subscription_data: { metadata: { agency_id: agency!.id } },
      metadata: { agency_id: agency!.id, plan },
    });

    return json({ url: checkout.url });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
