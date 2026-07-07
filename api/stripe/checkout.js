import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
const stripe = new Stripe(stripeKey);

const PLAN_MAP = {
  pro: (process.env.STRIPE_PRICE_PRO || '').trim(),
  business: (process.env.STRIPE_PRICE_BUSINESS || '').trim(),
};

export default async function handler(req, res) {
  if (req.query?.test === '1') {
    const key = process.env.STRIPE_SECRET_KEY || '';
    const keyOk = key.startsWith('sk_test_') || key.startsWith('sk_live_');
    return res.status(200).json({
      key_length: key.length,
      key_prefix: key.substring(0, 27) + '...',
      key_ok: keyOk,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { plan } = req.body;
  if (!plan || !PLAN_MAP[plan]) {
    return res.status(400).json({ error: 'Valid plan (pro, business) is required' });
  }

  const priceId = PLAN_MAP[plan];
  const origin = req.headers.origin || `https://${req.headers.host || 'plataforma-de-ia-ten.vercel.app'}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: userId, plan },
      success_url: `${origin}/planes.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/planes.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message, type: err.type });
  }
}
