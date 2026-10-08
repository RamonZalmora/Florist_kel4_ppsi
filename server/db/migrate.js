import { readFile } from 'node:fs/promises';
import { db, transaction } from './pool.js';
export async function migrate() {
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(493812)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const existing = await client.query('SELECT version FROM schema_migrations WHERE version=$1', [
      '001',
    ]);
    if (!existing.rowCount) {
      await client.query(await readFile(new URL('./001_initial.sql', import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['001']);
    }
  });
}
if (process.argv[1]?.endsWith('/migrate.js')) {
  try {
    await migrate();
    console.log('Database migration complete.');
  } finally {
    await db.end();
  }
}
