import 'dotenv/config';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const databaseDriver = process.env.DB_DRIVER || 'pglite';
if (!['pglite', 'postgres'].includes(databaseDriver))
  throw new Error('DB_DRIVER harus pglite atau postgres.');
let embedded;
let releaseLock;
export let db;

function adapter(client) {
  return {
    async query(sql, params = []) {
      const result = params.length
        ? await client.query(sql, params)
        : (await client.exec(sql)).at(-1);
      return {
        ...result,
        rows: result?.rows || [],
        rowCount: result?.rows?.length || result?.affectedRows || 0,
      };
    },
  };
}

if (databaseDriver === 'postgres') {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL wajib diisi untuk DB_DRIVER=postgres.');
  const { default: pg } = await import('pg');
  db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
} else {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const directory = resolve(root, process.env.DB_DIRECTORY || '.local/database');
  const lockPath = directory + '.lock';
  const token = randomUUID();
  await mkdir(dirname(directory), { recursive: true });
  async function acquire() {
    let handle;
    try {
      handle = await open(lockPath, 'wx', 0o600);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const lock = JSON.parse(await readFile(lockPath, 'utf8'));
      if (!Number.isInteger(lock.pid) || lock.pid <= 0)
        throw new Error('File lock database tidak valid; periksa sebelum melanjutkan.');
      try {
        process.kill(lock.pid, 0);
      } catch (e) {
        if (e.code === 'ESRCH') {
          await unlink(lockPath);
          return acquire();
        }
        throw e;
      }
      throw new Error(
        'Database lokal sedang dipakai. Hentikan server dengan Ctrl+C sebelum menjalankan setup, backup, atau server kedua.',
      );
    }
    await handle.writeFile(JSON.stringify({ pid: process.pid, token }));
    await handle.close();
    return async () => {
      const lock = JSON.parse(await readFile(lockPath, 'utf8'));
      if (lock.token === token) await unlink(lockPath);
    };
  }
  releaseLock = await acquire();
  try {
    const { PGlite } = await import('@electric-sql/pglite');
    embedded = new PGlite(directory);
    await embedded.waitReady;
  } catch (error) {
    await releaseLock();
    throw error;
  }
  db = {
    ...adapter(embedded),
    dump: () => embedded.dumpDataDir('gzip'),
    async end() {
      await embedded.close();
      await releaseLock();
    },
  };
}

export async function transaction(fn) {
  if (embedded) return embedded.transaction((client) => fn(adapter(client)));
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
