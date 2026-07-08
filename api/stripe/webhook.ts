import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function cleanEnv(val: string | undefined): string {
  return (val || '').replace(/^\uFEFF/, '').trim();
}

const stripe = new Stripe(cleanEnv(process.env.STRIPE_SECRET_KEY));
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const endpointSecret = cleanEnv(process.env.STRIPE_WEBHOOK_SECRET);

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing stripe-signature header' }));
    return;
  }

  const rawBody = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig as string, endpointSecret);
  } catch (err) {
    const error = err as Error;
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Webhook signature verification failed: ${error.message}` }));
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan || 'free';

    if (!userId) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ received: true }));
      return;
    }

    await supabase
      .from('users')
      .update({
        plan,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string || null,
        stripe_subscription_status: 'active',
      })
      .eq('id', userId);
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive';
    const plan = subscription.metadata?.plan || 'free';

    await supabase
      .from('users')
      .update({
        plan: status === 'active' ? plan : 'free',
        stripe_subscription_status: status,
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: true }));
}

export const config = {
  api: {
    bodyParser: false,
  },
};
