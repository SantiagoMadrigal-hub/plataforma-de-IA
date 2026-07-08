import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resendKey = (process.env.RESEND_API_KEY || '').replace(/^\uFEFF/, '').trim();
const resend = new Resend(resendKey);

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const action = req.query?.action as string | undefined;

  if (action === 'forgot') {
    const body = req.body as { email?: string } | undefined;
    const email = body?.email;
    if (!email) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Email is required' }));
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (user) {
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
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Si el correo existe, recibirás un enlace de recuperación.' }));
    return;
  }

  if (action === 'reset') {
    const body = req.body as { token?: string; password?: string } | undefined;
    const token = body?.token;
    const password = body?.password;
    if (!token || !password) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Token y contraseña son requeridos' }));
      return;
    }
    if (password.length < 6) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }));
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, reset_token, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (!user) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Token inválido o expirado' }));
      return;
    }
    if (new Date(user.reset_token_expires) < new Date()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Token expirado. Solicita un nuevo enlace.' }));
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await supabase
      .from('users')
      .update({ password_hash: passwordHash, reset_token: null, reset_token_expires: null })
      .eq('id', user.id);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Contraseña actualizada correctamente' }));
    return;
  }

  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Acción inválida. Usa ?action=forgot o ?action=reset' }));
}
