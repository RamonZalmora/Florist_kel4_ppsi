import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, transaction } from './db/pool.js';
import { authenticate, hashToken } from './auth.js';
import { fail } from './validation.js';

export const recovery = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' },
});
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const password = z
  .string()
  .min(12, 'Password minimal 12 karakter.')
  .max(128)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password maksimal 72 byte.');
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Tautan tidak valid.');
function localMode(req) {
  const mode =
    process.env.MAIL_MODE || (process.env.NODE_ENV === 'production' ? 'resend' : 'local');
  return (
    mode === 'local' &&
    process.env.NODE_ENV !== 'production' &&
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
  );
}
function ready(req) {
  return Boolean(
    req.app.locals.sendAccountMail ||
    localMode(req) ||
    ((process.env.MAIL_MODE || 'resend') === 'resend' &&
      process.env.RESEND_API_KEY &&
      process.env.MAIL_FROM &&
      process.env.PUBLIC_URL),
  );
}
function baseURL(req) {
  if (localMode(req))
    return new URL('http://localhost:' + Number(process.env.WEB_PORT || 3000)).origin;
  const url = new URL(process.env.PUBLIC_URL || 'http://localhost:3000');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    fail(503, 'PUBLIC_URL harus menggunakan HTTPS.');
  return url.origin;
}
async function send(req, to, purpose, token) {
  const link =
    baseURL(req) + (purpose === 'reset' ? '/reset-password' : '/verify-email') + '#token=' + token;
  const subject =
    purpose === 'reset' ? 'Atur ulang password Bien Vendre' : 'Verifikasi email Bien Vendre';
  const text = `${subject}\n\nBuka tautan ini dalam 15 menit:\n${link}\n\nJika Anda tidak meminta perubahan ini, abaikan email ini. Jangan bagikan tautan tersebut.`;
  if (req.app.locals.sendAccountMail) return req.app.locals.sendAccountMail({ to, subject, text });
  if (localMode(req)) {
    const directory = fileURLToPath(new URL('../.local/mail/', import.meta.url));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      join(directory, Date.now() + '-' + randomBytes(8).toString('hex') + '.txt'),
      `To: ${to}\nSubject: ${subject}\n\n${text}`,
      { mode: 0o600, flag: 'wx' },
    );
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('MAIL_DELIVERY_FAILED');
}
async function issue(req, userId, address, purpose) {
  const token = randomBytes(32).toString('hex'),
    hash = hashToken(token);
  await transaction(async (client) => {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    await client.query('DELETE FROM account_tokens WHERE user_id=$1 AND purpose=$2', [
      userId,
      purpose,
    ]);
    await client.query(
      "INSERT INTO account_tokens(token_hash,user_id,email,purpose,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 minutes')",
      [hash, userId, address, purpose],
    );
  });
  try {
    await send(req, address, purpose, token);
  } catch {
    await db.query('DELETE FROM account_tokens WHERE token_hash=$1', [hash]);
    throw new Error('MAIL_DELIVERY_FAILED');
  }
}
recovery.get('/recovery-status', (req, res) =>
  res.json({
    available: ready(req),
    mode: localMode(req) ? 'local' : ready(req) ? 'email' : 'disabled',
  }),
);
recovery.get('/profile', authenticate, async (req, res) =>
  res.json(
    (
      await db.query('SELECT username,name,role,email,email_verified FROM users WHERE id=$1', [
        req.user.id,
      ])
    ).rows[0],
  ),
);
recovery.post('/forgot-password', limiter, async (req, res) => {
  const address = email.parse(req.body.email);
  if (!ready(req))
    return res.status(503).json({ error: 'Pemulihan email belum diaktifkan. Hubungi owner toko.' });
  const user = (
    await db.query('SELECT id FROM users WHERE email=$1 AND email_verified=true', [address])
  ).rows[0];
  if (user) {
    try {
      await issue(req, user.id, address, 'reset');
    } catch {
      console.error('Account email delivery failed.');
    }
  }
  res.json({
    message:
      'Jika email terdaftar dan terverifikasi, instruksi pemulihan akan dikirim. Periksa kotak masuk dan spam.',
  });
});
recovery.post('/email/request', authenticate, limiter, async (req, res) => {
  const input = z.object({ email, password: z.string().min(1).max(128) }).parse(req.body);
  const user = (await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]))
    .rows[0];
  if (!(await bcrypt.compare(input.password, user.password_hash)))
    fail(403, 'Password saat ini salah.');
  if (!ready(req)) fail(503, 'Layanan email belum diaktifkan.');
  try {
    await issue(req, req.user.id, input.email, 'verify');
  } catch {
    fail(503, 'Email belum berhasil dikirim. Silakan coba lagi.');
  }
  res.json({ message: 'Buka email verifikasi untuk mengaktifkan alamat pemulihan Anda.' });
});
recovery.post('/email/verify', limiter, async (req, res) => {
  const hash = hashToken(tokenSchema.parse(req.body.token));
  await transaction(async (client) => {
    const token = (
      await client.query(
        "SELECT * FROM account_tokens WHERE token_hash=$1 AND purpose='verify' AND expires_at>now() FOR UPDATE",
        [hash],
      )
    ).rows[0];
    if (!token) fail(422, 'Tautan sudah digunakan atau kedaluwarsa.');
    await client.query('UPDATE users SET email=$1,email_verified=true WHERE id=$2', [
      token.email,
      token.user_id,
    ]);
    await client.query('DELETE FROM account_tokens WHERE user_id=$1', [token.user_id]);
  });
  res.json({ message: 'Email terverifikasi. Anda dapat menggunakan fitur lupa password.' });
});
recovery.post('/reset-password', limiter, async (req, res) => {
  const input = z.object({ token: tokenSchema, password }).parse(req.body),
    hash = hashToken(input.token),
    encrypted = await bcrypt.hash(input.password, 12);
  await transaction(async (client) => {
    const token = (
      await client.query(
        "SELECT * FROM account_tokens WHERE token_hash=$1 AND purpose='reset' AND expires_at>now() FOR UPDATE",
        [hash],
      )
    ).rows[0];
    if (!token) fail(422, 'Tautan sudah digunakan atau kedaluwarsa.');
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [encrypted, token.user_id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [token.user_id]);
    await client.query('DELETE FROM account_tokens WHERE user_id=$1', [token.user_id]);
  });
  res.json({ message: 'Password diperbarui. Silakan login kembali.' });
});
recovery.post('/change-password', authenticate, limiter, async (req, res) => {
  const input = z
    .object({ current_password: z.string().min(1).max(128), password })
    .parse(req.body);
  const encrypted = await bcrypt.hash(input.password, 12);
  await transaction(async (client) => {
    const user = (
      await client.query('SELECT password_hash FROM users WHERE id=$1 FOR UPDATE', [req.user.id])
    ).rows[0];
    if (!(await bcrypt.compare(input.current_password, user.password_hash)))
      fail(403, 'Password saat ini salah.');
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [encrypted, req.user.id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [req.user.id]);
    await client.query('DELETE FROM account_tokens WHERE user_id=$1', [req.user.id]);
  });
  res.json({ message: 'Password diperbarui. Silakan login kembali.' });
});
