import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resendKey = (process.env.RESEND_API_KEY || '').replace(/^\uFEFF/, '').trim();
const resend = new Resend(resendKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', email)
    .single();

  if (!user) {
    return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabase
    .from('users')
    .update({ reset_token: token, reset_token_expires: expires })
    .eq('id', user.id);

  const origin = `https://${req.headers.host || 'plataforma-de-ia-ten.vercel.app'}`;
  const resetUrl = `${origin}/reset-password.html?token=${token}`;

  try {
    await resend.emails.send({
      from: 'Lexora <onboarding@resend.dev>',
      to: email,
      subject: 'Recupera tu contraseña - Lexora',
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:sans-serif;padding:24px">
          <h2 style="color:#818cf8">Recupera tu contraseña</h2>
          <p>Hola ${user.name || 'usuario'},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para continuar:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#818cf8;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">Restablecer contraseña</a>
          <p style="color:#666;font-size:0.85rem">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Resend error:', err);
  }

  return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
}
