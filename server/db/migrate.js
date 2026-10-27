import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { db, transaction, databaseDriver } from './pool.js';
export async function migrate() {
  await transaction(async (client) => {
    if (databaseDriver === 'postgres') await client.query('SELECT pg_advisory_xact_lock(493812)');
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
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['002']))
        .rowCount
    ) {
      await client.query(await readFile(new URL('./002_accounts.sql', import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['002']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['003']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./003_store_tracking.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['003']);
    }
  });
}
if (basename(process.argv[1] || '') === 'migrate.js') {
  try {
    await migrate();
    console.log('Database migration complete.');
  } finally {
    await db.end();
  }
}
