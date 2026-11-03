import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir = mkdtempSync(join(tmpdir(), 'bien-real-catalog-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(dir, 'database');
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { realCatalog, directPrice, installRealCatalog } =
  await import('../server/db/real-catalog.js');

test('catalog replacement preserves history and never overwrites later edits', async () => {
  try {
    await migrate();
    assert.equal(realCatalog.length, 21);
    assert.equal(new Set(realCatalog.map((p) => p.name)).size, 21);
    for (const p of realCatalog) {
      assert.ok(
        directPrice(p.referencePrice) > 0 && directPrice(p.referencePrice) < p.referencePrice,
      );
      await readFile(
        new URL(
          `../web/public/assets/catalog/product-${String(p.image).padStart(2, '0')}.webp`,
          import.meta.url,
        ),
      );
    }
    const user = (
      await db.query(
        "INSERT INTO users(username,password_hash,name,role) VALUES('previous','hash','Previous','admin') RETURNING id",
      )
    ).rows[0];
    const old = (
      await db.query(
        "INSERT INTO products(name,price,flower_type,size,description) VALUES('Existing',1000,'Mawar','M','Existing product') RETURNING id",
      )
    ).rows[0];
    const cat = (
      await db.query("INSERT INTO categories(name) VALUES('Existing category') RETURNING id")
    ).rows[0];
    await db.query('INSERT INTO recommendations(category_id,product_id) VALUES($1,$2)', [
      cat.id,
      old.id,
    ]);
    const order = (
      await db.query(
        "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,created_by,status) VALUES('Customer','08123456789','2026-01-01','2026-01-02',1000,$1,'completed') RETURNING id",
        [user.id],
      )
    ).rows[0];
    await db.query(
      "INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES($1,$2,'Existing',1,1000)",
      [order.id, old.id],
    );
    await db.query(
      "INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,'2026-01-01',1000)",
      [order.id],
    );
    await db.query("DELETE FROM schema_migrations WHERE version='011'");
    await migrate();
    assert.equal(
      (await db.query('SELECT active FROM products WHERE id=$1', [old.id])).rows[0].active,
      false,
    );
    assert.equal(
      (await db.query('SELECT product_name FROM order_items WHERE order_id=$1', [order.id])).rows[0]
        .product_name,
      'Existing',
    );
    assert.equal((await db.query('SELECT count(*)::int AS count FROM sales')).rows[0].count, 1);
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM categories')).rows[0].count,
      1,
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM products WHERE active=true')).rows[0]
        .count,
      21,
    );
    const product = (await db.query('SELECT id FROM products WHERE name=$1', [realCatalog[0].name]))
      .rows[0];
    await db.query('UPDATE products SET price=123456, active=false WHERE id=$1', [product.id]);
    await transaction(installRealCatalog);
    await migrate();
    assert.equal((await db.query('SELECT count(*)::int AS count FROM products')).rows[0].count, 22);
    const edited = (await db.query('SELECT price,active FROM products WHERE id=$1', [product.id]))
      .rows[0];
    assert.equal(Number(edited.price), 123456);
    assert.equal(edited.active, false);
  } finally {
    await db.end();
    rmSync(dir, { recursive: true, force: true });
  }
});
