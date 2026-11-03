import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const directory = mkdtempSync(join(tmpdir(), 'bien-occasions-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(directory, 'database');
process.env.NODE_ENV = 'test';
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { installRealCatalog } = await import('../server/db/real-catalog.js');
const { installCatalogBatchTwo } = await import('../server/db/catalog-batch-two.js');
const { installOccasionCatalog } = await import('../server/db/occasion-catalog.js');
const { app } = await import('../server/index.js');

test('occasion suggestions preserve admin edits and filters combine with exact price boundaries', async () => {
  let server;
  try {
    await migrate();
    await transaction(installRealCatalog);
    await transaction(installCatalogBatchTwo);
    await db.query("INSERT INTO categories(name,description) VALUES('Wedding','Deskripsi toko')");
    await db.query("DELETE FROM schema_migrations WHERE version='013'");
    await migrate();
    const categories = (await db.query('SELECT * FROM categories')).rows;
    assert.equal(categories.length, 7);
    assert.equal(categories.find((c) => c.name === 'Wedding').description, 'Deskripsi toko');
    const wedding = categories.find((c) => c.name === 'Wedding');
    const rec = (
      await db.query('SELECT id FROM recommendations WHERE category_id=$1 LIMIT 1', [wedding.id])
    ).rows[0];
    assert.ok(rec);
    await db.query('DELETE FROM recommendations WHERE id=$1', [rec.id]);
    const remaining = (await db.query('SELECT count(*)::int AS count FROM recommendations')).rows[0]
      .count;
    await transaction(installOccasionCatalog);
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM recommendations')).rows[0].count,
      remaining,
    );
    await db.query(
      "INSERT INTO products(name,price,flower_type,size,description) VALUES('Batas hemat',99999.99,'Boneka','M','uji'),('Batas menengah',100000,'Boneka','M','uji'),('Batas premium',250000,'Boneka','M','uji')",
    );
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/products`;
    async function names(query) {
      return (await (await fetch(base + '?' + query)).json()).map((p) => p.name);
    }
    assert.deepEqual(await names('search=Batas&type=boneka&max_price=99999.99'), ['Batas hemat']);
    assert.deepEqual(await names('search=Batas&type=boneka&min_price=100000&max_price=249999.99'), [
      'Batas menengah',
    ]);
    assert.deepEqual(await names('search=Batas&type=boneka&min_price=250000'), ['Batas premium']);
    assert.equal((await fetch(base + '?type=unknown')).status, 422);
    assert.ok((await names(`category=${wedding.id}&type=frame&min_price=250000`)).length > 0);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.end();
    rmSync(directory, { recursive: true, force: true });
  }
});
