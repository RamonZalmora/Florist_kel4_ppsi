import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'bien-channels-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(directory, 'database');
const { db } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
test('store channels update existing settings once without changing other profile data', async () => {
  try {
    await migrate();
    await db.query("DELETE FROM schema_migrations WHERE version='009'");
    await db.query('ALTER TABLE store_settings DROP COLUMN shopee');
    await db.query('ALTER TABLE store_settings DROP COLUMN tokopedia');
    await db.query(
      "INSERT INTO store_settings(id,name,description,whatsapp) VALUES(1,'Toko Lama','Cerita lama','628566365052')",
    );
    await migrate();
    let row = (await db.query('SELECT * FROM store_settings WHERE id=1')).rows[0];
    assert.equal(row.name, 'Toko Lama');
    assert.equal(row.description, 'Cerita lama');
    assert.equal(row.whatsapp, '6282380087007');
    assert.equal(row.instagram, 'https://share.google/PciYm0L1lPyb6IhXpc');
    assert.equal(row.shopee, 'https://shopee.co.id/bienvendreofficial');
    assert.equal(
      row.tokopedia,
      'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
    );
    await db.query("UPDATE store_settings SET whatsapp='6281234567890' WHERE id=1");
    await migrate();
    row = (await db.query('SELECT whatsapp FROM store_settings WHERE id=1')).rows[0];
    assert.equal(row.whatsapp, '6281234567890');
    await db.query("DELETE FROM schema_migrations WHERE version='010'");
    await migrate();
    row = (await db.query('SELECT instagram,logo,whatsapp FROM store_settings WHERE id=1')).rows[0];
    assert.equal(
      row.instagram,
      'https://www.instagram.com/bienvendreofficial?psln=bm10anhqdTk5eG1y',
    );
    assert.equal(row.logo, '/assets/bien-mark.svg');
    assert.equal(row.whatsapp, '6281234567890');
    await db.query("UPDATE store_settings SET logo='/uploads/custom.webp' WHERE id=1");
    await db.query("DELETE FROM schema_migrations WHERE version='010'");
    await migrate();
    assert.equal(
      (await db.query('SELECT logo FROM store_settings WHERE id=1')).rows[0].logo,
      '/uploads/custom.webp',
    );
  } finally {
    await db.end();
    rmSync(directory, { recursive: true, force: true });
  }
});
