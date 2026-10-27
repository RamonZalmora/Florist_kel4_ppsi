import 'dotenv/config';
import { spawnSync } from 'node:child_process';
process.env.NODE_ENV = 'production';
if (process.env.DB_DRIVER !== 'postgres' || !process.env.DATABASE_URL)
  throw new Error('Hosting membutuhkan DB_DRIVER=postgres dan DATABASE_URL eksternal.');
if (!process.env.PUBLIC_URL || new URL(process.env.PUBLIC_URL).protocol !== 'https:')
  throw new Error('Isi PUBLIC_URL dengan alamat HTTPS aplikasi.');
process.env.COOKIE_SECURE = 'true';
process.env.SEED_DEMO ||= 'false';
for (const script of ['server/db/migrate.js', 'server/db/seed.js']) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
await import('../server/index.js');
