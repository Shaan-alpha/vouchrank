// Stripe webhook -> syncs subscription state onto the agency row (entitlements).
// Configure endpoint in Stripe to POST here; verify_jwt=false (verified by signature).
import Stripe from 'https://esm.sh/stripe@17?target=denonext';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-04-30.basil' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
// Deno uses the Web Crypto API for signature verification (not Node's crypto).
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Map Stripe Price -> plan tier + location cap (entitlements)
const PLAN_BY_PRICE: Record<string, { plan: string; maxLocations: number }> = {
  [Deno.env.get('STRIPE_PRICE_AGENCY') ?? '_agency']: { plan: 'agency', maxLocations: 15 },
  [Deno.env.get('STRIPE_PRICE_AGENCY_PRO') ?? '_pro']: { plan: 'agency_pro', maxLocations: 100000 },
};

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
};

async function syncSubscription(sub: Stripe.Subscription) {
  const agencyId = sub.metadata?.agency_id;
  if (!agencyId) return;
  const priceId = sub.items.data[0]?.price.id ?? '';
  const entitlement = PLAN_BY_PRICE[priceId] ?? { plan: 'trial', maxLocations: 15 };

  await supabaseAdmin
    .from('agencies')
    .update({
      stripe_subscription_id: sub.id,
      plan: entitlement.plan,
      plan_status: STATUS_MAP[sub.status] ?? 'incomplete',
      max_locations: entitlement.maxLocations,
    })
    .eq('id', agencyId);
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret, undefined, cryptoProvider);
  } catch (err) {
    return new Response(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
});
