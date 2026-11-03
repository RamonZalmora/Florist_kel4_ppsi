import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir = mkdtempSync(join(tmpdir(), 'bien-demo-orders-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(dir, 'db');
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { installRealCatalog } = await import('../server/db/real-catalog.js');
const { installCatalogBatchTwo } = await import('../server/db/catalog-batch-two.js');
const { seedDemoOrders, clearDemoOrders } = await import('../server/db/demo-orders.js');
test('30 labelled demo orders preserve totals, completed-only sales and idempotent setup', async () => {
  try {
    await migrate();
    await transaction(installRealCatalog);
    await transaction(installCatalogBatchTwo);
    await db.query(
      "INSERT INTO users(username,password_hash,name,role) VALUES('demo-admin','hash','Demo Admin','admin')",
    );
    await transaction(seedDemoOrders);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n, 30);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM sales')).rows[0].n, 24);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM orders WHERE status='pending'")).rows[0].n,
      6,
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM orders WHERE customer_name LIKE '[DEMO]%' AND phone_number LIKE '08000000%'",
        )
      ).rows[0].n,
      30,
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS n FROM orders o WHERE o.total<>(SELECT sum(subtotal) FROM order_items WHERE order_id=o.id)',
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM sales s JOIN orders o ON o.id=s.order_id WHERE o.status<>'completed' OR o.total<>s.total_sale",
        )
      ).rows[0].n,
      0,
    );
    await transaction(seedDemoOrders);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n, 30);
    await db.query(
      "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,created_by) SELECT 'Actual customer','081234567891',order_date,delivery_date,0,created_by FROM orders LIMIT 1",
    );
    assert.equal(await transaction(clearDemoOrders), 30);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n, 1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM sales')).rows[0].n, 0);
    await transaction(seedDemoOrders);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n, 1);
  } finally {
    await db.end();
    rmSync(dir, { recursive: true, force: true });
  }
});
