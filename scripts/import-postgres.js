import 'dotenv/config';
import pg from 'pg';
import { db, transaction, databaseDriver } from '../server/db/pool.js';
import { migrate } from '../server/db/migrate.js';
import { transfer } from '../server/db/transfer.js';
const sourceUrl = process.env.IMPORT_DATABASE_URL || process.env.DATABASE_URL;
const source = new pg.Client({ connectionString: sourceUrl });
try {
  if (databaseDriver !== 'pglite') throw new Error('Pilih DB_DRIVER=pglite sebagai tujuan import.');
  if (!sourceUrl)
    throw new Error(
      'Isi IMPORT_DATABASE_URL atau DATABASE_URL dengan koneksi database lama di .env.',
    );
  await source.connect();
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await migrate();
  const counts = await transaction((destination) => transfer(source, destination));
  await source.query('COMMIT');
  console.log(
    'Import selesai. Akun, hash password, katalog, pesanan, dan penjualan dipertahankan.',
  );
  console.table(counts);
} catch (error) {
  console.error('Import gagal:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await source.end();
  await db.end();
}
