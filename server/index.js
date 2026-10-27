import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { auth } from './auth.js';
import { recovery } from './recovery.js';
import { dataStudio } from './routes/data.js';
import { db, databaseDriver } from './db/pool.js';
import { catalog, management } from './routes/catalog.js';
import { orders } from './routes/orders.js';
import { reports, dashboard } from './routes/reports.js';
export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", 'data:', 'https:'],
        upgradeInsecureRequests: process.env.COOKIE_SECURE === 'true' ? [] : null,
      },
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok', database: 'PostgreSQL', driver: databaseDriver });
});
app.use('/api/auth', auth);
app.use('/api/auth', recovery);
app.use('/api', catalog);
app.use('/api/manage', management);
app.use('/api/orders', orders);
app.use('/api/reports', reports);
app.use('/api/dashboard', dashboard);
app.use('/api/data', dataStudio);
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.use(express.static(fileURLToPath(new URL('../dist/', import.meta.url))));
app.get('/{*path}', (req, res) =>
  res.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url))),
);
app.use((error, req, res, next) => {
  if (error instanceof ZodError)
    return res.status(422).json({
      error: 'Data tidak valid.',
      details: error.issues.map((x) => `${x.path.join('.')}: ${x.message}`),
    });
  if (error.code === '23505')
    return res
      .status(409)
      .json({ error: 'Data sudah ada. Gunakan nama atau kombinasi yang berbeda.' });
  if (['23503', '23001'].includes(error.code))
    return res
      .status(409)
      .json({ error: 'Data sedang digunakan. Hapus relasi terkait atau nonaktifkan produk.' });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error('Request failed:', error.code || error.message);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(
    Number(process.env.PORT || 3000),
    process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
    () => console.log('Bien Vendre listening on port', process.env.PORT || 3000),
  );
  const shutdown = () =>
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
