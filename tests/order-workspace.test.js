import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';

const directory = mkdtempSync(join(tmpdir(), 'bien-orders-workspace-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(directory, 'database');
process.env.NODE_ENV = 'test';
const { db } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { app } = await import('../server/index.js');
let server, base, admin, owner, categoryA, categoryB, typeA, typeB, ids;
async function request(query, session = admin) {
  const response = await fetch(base + '/api/orders/workspace?' + new URLSearchParams(query), {
    headers: session ? { Cookie: session.cookie } : {},
  });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  await migrate();
  const password = 'Order workspace fixture password';
  let adminId;
  for (const role of ['admin', 'owner']) {
    const user = (
      await db.query(
        'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id',
        [role, await bcrypt.hash(password, 4), role, role],
      )
    ).rows[0];
    if (role === 'admin') adminId = user.id;
  }
  categoryA = (
    await db.query("INSERT INTO categories(name) VALUES('Workspace Wedding') RETURNING id")
  ).rows[0].id;
  categoryB = (
    await db.query("INSERT INTO categories(name) VALUES('Workspace Birthday') RETURNING id")
  ).rows[0].id;
  [typeA, typeB] = (await db.query('SELECT id FROM product_types ORDER BY id LIMIT 2')).rows.map(
    (row) => row.id,
  );
  const products = [];
  for (const [name, type] of [
    ['A', typeA],
    ['B', typeB],
  ]) {
    products.push(
      (
        await db.query(
          "INSERT INTO products(name,price,flower_type,size,description,product_type_id) VALUES($1,10000,'Mawar','M','Workspace fixture',$2) RETURNING id",
          ['Workspace ' + name, type],
        )
      ).rows[0].id,
    );
  }
  for (const [product, category] of [
    [products[0], categoryA],
    [products[1], categoryB],
  ])
    await db.query('INSERT INTO recommendations(product_id,category_id) VALUES($1,$2)', [
      product,
      category,
    ]);
  ids = [];
  for (let i = 0; i < 15; i++) {
    const offset = i < 10 ? i : 35;
    const status = i < 8 ? 'completed' : 'pending';
    const deliveryOffset = i === 8 ? 0 : i === 9 ? -1 : 2;
    const id = (
      await db.query(
        "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,status,created_by) VALUES($1,'08123456789',(now() AT TIME ZONE 'Asia/Jakarta')::date-$2::int,(now() AT TIME ZONE 'Asia/Jakarta')::date+$3::int,10000,$4,$5) RETURNING id",
        ['Workspace customer ' + i, offset, deliveryOffset, status, adminId],
      )
    ).rows[0].id;
    ids.push(id);
    const selected = i === 1 ? [products[1]] : i === 0 ? products : [products[0]];
    for (const product of selected)
      await db.query(
        "INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES($1,$2,'Workspace fixture',3,10000)",
        [id, product],
      );
    await db.query('UPDATE orders SET total=$1 WHERE id=$2', [selected.length * 30000, id]);
    if (status === 'completed')
      await db.query(
        "INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,(now() AT TIME ZONE 'Asia/Jakarta')::date,$2)",
        [id, selected.length * 30000],
      );
  }
  // More than 500 orders must remain visible through server pagination.
  await db.query(
    "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,created_by) SELECT 'Overflow fixture','08111111111',(now() AT TIME ZONE 'Asia/Jakarta')::date,(now() AT TIME ZONE 'Asia/Jakarta')::date+1,10000,$1 FROM generate_series(1,506)",
    [adminId],
  );
  await db.query(
    "INSERT INTO order_items(order_id,product_id,product_name,quantity,price) SELECT id,$1,'Overflow fixture',1,10000 FROM orders WHERE customer_name='Overflow fixture'",
    [products[0]],
  );
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  for (const role of ['admin', 'owner']) {
    const response = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: role, password }),
    });
    assert.equal(response.status, 200);
    const session = {
      ...(await response.json()),
      cookie: response.headers.get('set-cookie').split(';')[0],
    };
    if (role === 'admin') admin = session;
    else owner = session;
  }
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await db.end();
  rmSync(directory, { recursive: true, force: true });
});

test('workspace pagination and summaries include all matching orders for both roles', async () => {
  for (const session of [admin, owner]) {
    const result = await request({ q: 'Workspace customer', period: 'all' }, session);
    assert.equal(result.status, 200);
    assert.equal(result.data.total, 15);
    assert.equal(result.data.summary.completed, 8);
    assert.equal(result.data.summary.pending, 7);
    assert.equal(Number(result.data.summary.completed_value), 270000);
    assert.equal(result.data.pages, 3);
    assert.equal(result.data.orders.length, 7);
    assert.deepEqual(
      result.data.orders.map((order) => order.id),
      ids.slice().reverse().slice(0, 7),
    );
    assert.equal(
      result.data.trend.reduce((sum, day) => sum + day.completed + day.pending, 0),
      15,
    );
    const second = await request({ q: 'Workspace customer', page: 2 }, session);
    assert.deepEqual(
      second.data.orders.map((order) => order.id),
      ids.slice().reverse().slice(7, 14),
    );
  }
  const all = await request({ q: 'Overflow fixture', page: 999 });
  assert.equal(all.data.total, 506);
  assert.equal(all.data.page, 73);
  assert.equal(all.data.orders.length, 2);
});
test('period, status, due-date and same-item category/type filters combine without duplicate orders', async () => {
  const seven = await request({ q: 'Workspace customer', period: '7' });
  assert.equal(seven.data.total, 7);
  assert.equal(seven.data.trend.length, 7);
  assert.equal(
    seven.data.trend.reduce((sum, day) => sum + day.completed, 0),
    7,
  );
  const month = await request({ q: 'Workspace customer', period: 'month' });
  const today = (await db.query("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS day"))
    .rows[0].day;
  assert.equal(month.data.total, Math.min(Number(today.slice(-2)), 10));
  const completed = await request({ q: 'Workspace customer', status: 'completed' });
  assert.equal(completed.data.total, 8);
  assert.equal(completed.data.summary.pending, 0);
  const due = await request({ q: 'Workspace customer', due: 'today' });
  assert.equal(due.data.total, 1);
  assert.equal(due.data.orders[0].id, ids[8]);
  const overdue = await request({ q: 'Workspace customer', due: 'overdue' });
  assert.equal(overdue.data.total, 1);
  assert.equal(overdue.data.orders[0].id, ids[9]);
  const category = await request({ q: 'Workspace customer', category: categoryA, type: typeA });
  assert.equal(category.data.total, 14);
  const other = await request({ q: 'Workspace customer', category: categoryB, type: typeB });
  assert.equal(other.data.total, 2);
  const mismatch = await request({ q: 'Workspace customer', category: categoryA, type: typeB });
  assert.equal(mismatch.data.total, 0);
  const sorted = await request({ q: 'Workspace customer', sort: 'delivery' });
  assert.equal(sorted.data.orders[0].id, ids[9]);
  const byCode = await request({ q: 'BV-' + String(ids[0]).padStart(4, '0') });
  assert.equal(byCode.data.total, 1);
  assert.ok(byCode.data.orders[0].items[0].categories.length > 0);
});
test('workspace requires authentication and validates filter inputs', async () => {
  assert.equal((await request({}, null)).status, 401);
  for (const query of [
    { period: '365' },
    { page: '0' },
    { category: '1 OR 1=1' },
    { status: 'cancelled' },
    { q: 'x'.repeat(121) },
  ])
    assert.equal((await request(query)).status, 422);
});
