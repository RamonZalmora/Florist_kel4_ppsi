import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from './db/pool.js';
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  path: '/',
};
export async function authenticate(req, res, next) {
  const raw = req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('bv_session='))
    ?.slice(11);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw))
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  const { rows } = await db.query(
    'SELECT u.id,u.username,u.name,u.role,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
    [hashToken(raw)],
  );
  if (!rows.length) return res.status(401).json({ error: 'Sesi berakhir. Silakan login kembali.' });
  req.user = rows[0];
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const supplied = Buffer.from(req.get('X-CSRF-Token') || '');
    const expected = Buffer.from(req.user.csrf_token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return res.status(403).json({ error: 'Token keamanan tidak valid.' });
  }
  next();
}
export const authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk tindakan ini.' });
export const auth = Router();
auth.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  }),
  async (req, res) => {
    const input = z
      .object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) })
      .parse(req.body);
    const { rows } = await db.query('SELECT * FROM users WHERE username=$1', [input.username]);
    const valid = await bcrypt.compare(
      input.password,
      rows[0]?.password_hash || '$2b$12$EJFGSXnpEGTvgnCS0JPxx.XPTMiONFVUVLWlp1GyvwfxsvVNqcY7m',
    );
    if (!rows.length || !valid)
      return res.status(401).json({ error: 'Username atau password salah.' });
    const token = randomBytes(32).toString('hex'),
      csrf = randomBytes(32).toString('hex');
    await db.query('DELETE FROM sessions WHERE expires_at <= now()');
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '12 hours')",
      [hashToken(token), rows[0].id, csrf],
    );
    res.cookie('bv_session', token, { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 });
    res.json({
      id: rows[0].id,
      name: rows[0].name,
      username: rows[0].username,
      role: rows[0].role,
      csrf_token: csrf,
    });
  },
);
auth.get('/me', authenticate, (req, res) => res.json(req.user));
auth.post('/logout', authenticate, async (req, res) => {
  const raw = req.headers.cookie
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('bv_session='))
    .slice(11);
  await db.query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(raw)]);
  res.clearCookie('bv_session', cookieOptions).json({ ok: true });
});
