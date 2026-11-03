import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir = mkdtempSync(join(tmpdir(), 'bien-catalog-two-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(dir, 'database');
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { catalogBatchTwo, installCatalogBatchTwo } =
  await import('../server/db/catalog-batch-two.js');
const { directPrice } = await import('../server/db/real-catalog.js');

test('new catalog adds products once while preserving existing products and later changes', async () => {
  try {
    assert.equal(catalogBatchTwo.length, 45);
    assert.equal(new Set(catalogBatchTwo.map((p) => p.name)).size, 45);
    for (const p of catalogBatchTwo) {
      assert.ok(
        directPrice(p.referencePrice) > 0 && directPrice(p.referencePrice) < p.referencePrice,
      );
      await access(
        new URL(`../web/public/assets/catalog/product-${p.image}.webp`, import.meta.url),
      );
    }
    await migrate();
    const old = (
      await db.query(
        "INSERT INTO products(name,price,flower_type,size,description) VALUES('Existing',12345,'Other','M','Existing') RETURNING id",
      )
    ).rows[0];
    await db.query("DELETE FROM schema_migrations WHERE version='012'");
    await migrate();
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM products WHERE active=true')).rows[0]
        .count,
      46,
    );
    assert.equal(
      Number((await db.query('SELECT price FROM products WHERE id=$1', [old.id])).rows[0].price),
      12345,
    );
    const product = (
      await db.query('SELECT id FROM products WHERE name=$1', [catalogBatchTwo[0].name])
    ).rows[0];
    await db.query('UPDATE products SET price=12000, active=false WHERE id=$1', [product.id]);
    await transaction(installCatalogBatchTwo);
    await migrate();
    assert.equal((await db.query('SELECT count(*)::int AS count FROM products')).rows[0].count, 46);
    const edited = (await db.query('SELECT price,active FROM products WHERE id=$1', [product.id]))
      .rows[0];
    assert.equal(Number(edited.price), 12000);
    assert.equal(edited.active, false);
  } finally {
    await db.end();
    rmSync(dir, { recursive: true, force: true });
  }
});
