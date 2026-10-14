import 'dotenv/config';
import { readFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const [backup, target] = process.argv.slice(2);
if (!backup || !target)
  throw new Error('Gunakan: npm run db:restore -- FILE_BACKUP FOLDER_DATABASE_BARU');
const directory = resolve(target);
try {
  await lstat(directory);
  throw new Error('Folder tujuan sudah ada. Pilih folder baru agar data lama tidak tertimpa.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const contents = new Blob([await readFile(resolve(backup))]);
await mkdir(dirname(directory), { recursive: true });
const database = await PGlite.create({ dataDir: directory, loadDataDir: contents });
try {
  await database.query('SELECT count(*) FROM products');
  await database.query('DELETE FROM sessions');
  console.log(
    'Restore berhasil ke folder baru. Atur DB_DIRECTORY ke folder tersebut di .env sebelum startup.',
  );
} finally {
  await database.close();
}
