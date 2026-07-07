import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, reset_token, reset_token_expires')
    .eq('reset_token', token)
    .single();

  if (!user) {
    return res.status(400).json({ error: 'Token inválido o expirado' });
  }

  if (new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Token expirado. Solicita un nuevo enlace.' });
  }

  const password_hash = await bcrypt.hash(password, 10);

  await supabase
    .from('users')
    .update({
      password_hash,
      reset_token: null,
      reset_token_expires: null,
    })
    .eq('id', user.id);

  return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
}
