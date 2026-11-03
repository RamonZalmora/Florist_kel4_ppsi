import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db, transaction, databaseDriver } from '../server/db/pool.js';
import { createVpsSnapshot } from '../server/db/vps-transfer.js';
try {
  if (databaseDriver !== 'pglite') throw new Error('Ekspor ini membutuhkan database lokal PGlite.');
  const snapshot = await transaction(createVpsSnapshot);
  const directory = '.local/vps-transfer';
  await mkdir(directory, { recursive: true });
  const file = join(
    directory,
    `bien-vendre-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  await writeFile(file, JSON.stringify(snapshot), { mode: 0o600, flag: 'wx' });
  console.log('Ekspor privat dibuat: ' + file);
  console.table(
    Object.fromEntries(
      Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length]),
    ),
  );
} finally {
  await db.end();
}
