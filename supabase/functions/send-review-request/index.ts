// Sends a compliant review request via SMS (Twilio) or email (Resend) and logs
// it to the campaigns table. The message links to the public funnel — it never
// pre-filters by expected sentiment (FTC/Google compliant).
//
// SMS note: US A2P 10DLC registration of the Twilio Messaging Service is
// required before sending at scale; allow weeks of lead time.
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, getUser, getAgencyForUser } from '../_shared/supabaseAdmin.ts';

async function sendSms(to: string, body: string): Promise<string> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const service = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, MessagingServiceSid: service, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'twilio_error');
  return data.sid;
}

async function sendEmail(to: string, subject: string, html: string): Promise<string> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: 'reviews@vouchrank.com', to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'resend_error');
  return data.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const member = await getAgencyForUser(user.id);
    if (!member) return json({ error: 'forbidden' }, 403);

    const { locationId, channel, recipient, firstName } = await req.json();

    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id, agency_id, name')
      .eq('id', locationId)
      .single();
    if (!loc || loc.agency_id !== member.agency_id) return json({ error: 'forbidden' }, 403);

    const base = Deno.env.get('APP_BASE_URL') ?? 'https://app.vouchrank.com';
    const link = `${base}/r/${loc.id}`;
    const name = firstName || 'there';

    let providerId = '';
    let status = 'sent';
    try {
      if (channel === 'sms') {
        providerId = await sendSms(
          recipient,
          `Hi ${name}! Thanks for choosing ${loc.name}. Mind sharing your honest feedback? ${link}`,
        );
      } else {
        providerId = await sendEmail(
          recipient,
          `How was your experience with ${loc.name}?`,
          `<p>Hi ${name},</p><p>Thank you for choosing ${loc.name}. We'd love your honest feedback — good or bad.</p><p><a href="${link}">Share your experience</a></p>`,
        );
      }
    } catch (e) {
      status = 'failed';
      await supabaseAdmin.from('campaigns').insert({
        location_id: loc.id, agency_id: loc.agency_id, channel, recipient, status,
      });
      return json({ error: (e as Error).message }, 502);
    }

    await supabaseAdmin.from('campaigns').insert({
      location_id: loc.id, agency_id: loc.agency_id, channel, recipient, status, provider_id: providerId,
    });

    return json({ ok: true, providerId });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
