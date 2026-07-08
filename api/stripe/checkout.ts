import type { ServerResponse } from 'http';
import type { VercelRequest, AuthenticatedRequest } from '../../lib/types.js';
import { withAuth } from '../../lib/middleware/withAuth.js';
import Stripe from 'stripe';

function cleanEnv(val: string | undefined): string {
  return (val || '').replace(/^\uFEFF/, '').trim();
}

const stripeKey = cleanEnv(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(stripeKey);

const PLAN_MAP: Record<string, string> = {
  pro: cleanEnv(process.env.STRIPE_PRICE_PRO),
  business: cleanEnv(process.env.STRIPE_PRICE_BUSINESS),
};

async function handler(req: VercelRequest, res: ServerResponse) {
  const authReq = req as AuthenticatedRequest;

  if (req.method === 'GET' && req.query?.test === '1') {
    const key = cleanEnv(process.env.STRIPE_SECRET_KEY);
    const keyOk = key.startsWith('sk_test_') || key.startsWith('sk_live_');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      key_length: key.length,
      key_prefix: key.substring(0, 27) + '...',
      key_ok: keyOk,
    }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const body = req.body as { plan?: string } | undefined;
  const plan = body?.plan;
  if (!plan || !PLAN_MAP[plan]) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Valid plan (pro, business) is required' }));
    return;
  }

  const priceId = PLAN_MAP[plan];
  const origin = req.headers.origin || `https://${req.headers.host || 'plataforma-de-ia-ten.vercel.app'}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: authReq.user.id, plan },
      success_url: `${origin}/planes.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/planes.html`,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ url: session.url }));
  } catch (err) {
    const error = err as Error & { type?: string };
    console.error('Stripe checkout error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message, type: error.type }));
  }
}

export default withAuth(handler);
