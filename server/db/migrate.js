import { createProductTypes } from './product-types.js';
import { installClassificationArtwork } from './classification-artwork.js';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { db, transaction, databaseDriver } from './pool.js';
import { installRealCatalog } from './real-catalog.js';
import { installCatalogBatchTwo } from './catalog-batch-two.js';
import { installOccasionCatalog } from './occasion-catalog.js';
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
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['011']))
        .rowCount
    ) {
      if ((await client.query('SELECT id FROM products LIMIT 1')).rowCount)
        await installRealCatalog(client);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['011']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['012']))
        .rowCount
    ) {
      if ((await client.query('SELECT id FROM products LIMIT 1')).rowCount)
        await installCatalogBatchTwo(client);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['012']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['013']))
        .rowCount
    ) {
      if ((await client.query('SELECT id FROM products LIMIT 1')).rowCount)
        await installOccasionCatalog(client);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['013']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['014']))
        .rowCount
    ) {
      await client.query(
        "ALTER TABLE store_settings ADD COLUMN map_url varchar(1000) NOT NULL DEFAULT 'https://maps.app.goo.gl/cZhMm6Z3326uHWz77'",
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['014']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['015']))
        .rowCount
    ) {
      await createProductTypes(client);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['015']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['016']))
        .rowCount
    ) {
      await installClassificationArtwork(client);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['016']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['017']))
        .rowCount
    ) {
      await client.query(
        `ALTER TABLE store_settings ADD COLUMN latitude double precision CHECK(latitude BETWEEN -90 AND 90), ADD COLUMN longitude double precision CHECK(longitude BETWEEN -180 AND 180), ADD CONSTRAINT store_coordinate_pair CHECK((latitude IS NULL) = (longitude IS NULL))`,
      );
      await client.query(
        "UPDATE store_settings SET latitude=0.4734722222,longitude=101.3748055556 WHERE map_url='https://maps.app.goo.gl/cZhMm6Z3326uHWz77'",
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['017']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['018']))
        .rowCount
    ) {
      await client.query(
        "UPDATE orders SET customer_name=ltrim(substr(customer_name,7)) WHERE left(upper(customer_name),6)='[DEMO]' AND length(trim(substr(customer_name,7)))>0",
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['018']);
    }
    if (
      !(await client.query('SELECT version FROM schema_migrations WHERE version=$1', ['019']))
        .rowCount
    ) {
      await client.query(
        await readFile(new URL('./019_store_location.sql', import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', ['019']);
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
