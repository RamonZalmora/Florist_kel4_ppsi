import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { db, databaseDriver } from '../server/db/pool.js';
try {
  if (databaseDriver !== 'pglite')
    throw new Error(
      'Gunakan fasilitas backup penyedia PostgreSQL eksternal untuk DB_DRIVER=postgres.',
    );
  const directory = fileURLToPath(new URL('../.local/backups/', import.meta.url));
  await mkdir(directory, { recursive: true });
  const file = join(
    directory,
    'bien-vendre-' + new Date().toISOString().replace(/[:.]/g, '-') + '.tar.gz',
  );
  await writeFile(file, Buffer.from(await (await db.dump()).arrayBuffer()), {
    mode: 0o600,
    flag: 'wx',
  });
  console.log('Backup tersimpan di .local/backups. Simpan secara pribadi; jangan unggah ke Git.');
} finally {
  await db.end();
}
