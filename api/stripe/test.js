import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(key);
    const prices = await stripe.prices.list({ limit: 1 });
    return res.status(200).json({ ok: true, key_prefix: key?.substring(0, 15), prices: prices.data.length });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      type: err.type,
      code: err.code,
      detail: err.raw?.detail?.message || err.raw?.detail?.toString() || null,
    });
  }
}
