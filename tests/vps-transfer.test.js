import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const dir = mkdtempSync(join(tmpdir(), 'bien-vps-transfer-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(dir, 'source');
process.env.NODE_ENV = 'test';
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { createVpsSnapshot, restoreVpsSnapshot } = await import('../server/db/vps-transfer.js');
after(async () => {
  await db.end();
  rmSync(dir, { recursive: true, force: true });
});
test('VPS transfer preserves account, order, sales, settings and photo paths and refuses nonempty destination', async () => {
  await migrate();
  const freshDump = await db.dump();
  const target = await PGlite.create({ dataDir: 'memory://', loadDataDir: freshDump });
  try {
    await db.query(
      "INSERT INTO users(id,username,password_hash,name,role,email,email_verified) OVERRIDING SYSTEM VALUE VALUES(10,'owner','fake-hash','Example','owner','owner@example.test',true)",
    );
    await db.query(
      "UPDATE product_types SET name='Custom type',photo='/uploads/type.webp' WHERE id=1",
    );
    await db.query(
      "INSERT INTO categories(id,name,photo) OVERRIDING SYSTEM VALUE VALUES(20,'Wedding','/uploads/category.webp')",
    );
    await db.query(
      "INSERT INTO products(id,name,price,flower_type,size,description,photo,product_type_id) OVERRIDING SYSTEM VALUE VALUES(30,'Example',123456.78,'Flower','M','Sample','/uploads/product.webp',1)",
    );
    await db.query(
      'INSERT INTO recommendations(id,category_id,product_id) OVERRIDING SYSTEM VALUE VALUES(40,20,30)',
    );
    await db.query(
      "INSERT INTO orders(id,customer_name,phone_number,order_date,delivery_date,status,total,created_by,tracking_code) OVERRIDING SYSTEM VALUE VALUES(50,'Example','08123456789','2026-10-01','2026-10-02','completed',246913.56,10,'0123456789abcdef0123456789abcdef')",
    );
    await db.query(
      "INSERT INTO order_items(id,order_id,product_id,product_name,quantity,price) OVERRIDING SYSTEM VALUE VALUES(60,50,30,'Example',2,123456.78)",
    );
    await db.query(
      "INSERT INTO sales(id,order_id,sale_date,total_sale) OVERRIDING SYSTEM VALUE VALUES(70,50,'2026-10-02',246913.56)",
    );
    await db.query(
      "INSERT INTO store_settings(id,name,address,latitude,longitude,about_story) VALUES(1,'Example','Pekanbaru',0.5,101.4,'Story')",
    );
    await db.query(
      "INSERT INTO product_favorites(product_id,visitor_id) VALUES(30,'01234567-89ab-4cde-8fab-0123456789ab')",
    );
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES(repeat('a',64),10,'csrf',now()+interval '1 hour')",
    );
    const snapshot = JSON.parse(JSON.stringify(await transaction(createVpsSnapshot)));
    assert.ok(!('sessions' in snapshot.tables));
    assert.ok(!('account_tokens' in snapshot.tables));
    const counts = await target.transaction((client) => restoreVpsSnapshot(client, snapshot));
    assert.equal(counts.sales, 1);
    assert.equal(
      (await target.query('SELECT password_hash,email,email_verified FROM users')).rows[0]
        .password_hash,
      'fake-hash',
    );
    assert.equal(
      (await target.query('SELECT tracking_code FROM orders')).rows[0].tracking_code,
      '0123456789abcdef0123456789abcdef',
    );
    assert.equal(
      Number((await target.query('SELECT subtotal FROM order_items')).rows[0].subtotal),
      246913.56,
    );
    assert.equal(
      (await target.query('SELECT photo FROM products')).rows[0].photo,
      '/uploads/product.webp',
    );
    assert.equal((await target.query('SELECT latitude FROM store_settings')).rows[0].latitude, 0.5);
    assert.equal(
      (await target.query('SELECT name FROM product_types WHERE id=1')).rows[0].name,
      'Custom type',
    );
    assert.equal(Number((await target.query('SELECT count(*) AS n FROM sessions')).rows[0].n), 0);
    const next = await target.query("INSERT INTO categories(name) VALUES('Next') RETURNING id");
    assert.equal(Number(next.rows[0].id), 21);
    await assert.rejects(
      target.transaction((client) => restoreVpsSnapshot(client, snapshot)),
      /tidak kosong/,
    );
  } finally {
    await target.close();
  }
});
