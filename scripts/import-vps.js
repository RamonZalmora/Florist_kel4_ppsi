import { readFile } from 'node:fs/promises';
if (!process.env.DB_HOST || !process.env.POSTGRES_PASSWORD)
  throw new Error('DB_HOST dan POSTGRES_PASSWORD wajib tersedia.');
process.env.DB_DRIVER = 'postgres';
process.env.DATABASE_URL = `postgresql://florist:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@${process.env.DB_HOST}:5432/bien_vendre`;
const file = process.argv[2];
if (!file) throw new Error('Berikan path file ekspor privat.');
const snapshot = JSON.parse(await readFile(file, 'utf8'));
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { restoreVpsSnapshot } = await import('../server/db/vps-transfer.js');
try {
  const existing = await db.query("SELECT to_regclass('public.users') AS users");
  if (existing.rows[0].users)
    throw new Error('Database tujuan sudah memiliki tabel aplikasi; impor dibatalkan.');
  await migrate();
  const counts = await transaction((client) => restoreVpsSnapshot(client, snapshot));
  console.log('Migrasi selesai. Sesi lama tidak dipindahkan; pengguna perlu login kembali.');
  console.table(counts);
} finally {
  await db.end();
}
