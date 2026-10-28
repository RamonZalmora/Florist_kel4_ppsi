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
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['004']))
        .rowCount
    ) {
      await client.query(await readFile(new URL('./004_favorites.sql', import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['004']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['005']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./005_product_updated_at.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['005']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['006']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./006_order_status.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['006']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['007']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./007_birthday_examples.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['007']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['008']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./008_whatsapp_contact.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['008']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['009']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./009_store_channels.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['009']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['010']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./010_brand_instagram.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['010']);
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
