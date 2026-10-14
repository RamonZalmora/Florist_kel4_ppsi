import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const testDirectory = mkdtempSync(join(tmpdir(), 'bien-vendre-test-'));
process.env.DB_DRIVER = process.env.TEST_DB_DRIVER || 'pglite';
process.env.DB_DIRECTORY = join(testDirectory, 'database');
const { db } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
process.env.NODE_ENV = 'test';
const { app } = await import('../server/index.js');
const suffix = randomBytes(5).toString('hex');
let server, base, admin, owner, adminId, ownerId;
const created = { products: [], categories: [], recommendations: [], orders: [] };
async function request(path, { method = 'GET', body, session, csrf = true } = {}) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session
        ? { Cookie: session.cookie, ...(csrf ? { 'X-CSRF-Token': session.csrf_token } : {}) }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, response };
}
async function login(username, password) {
  const r = await request('/auth/login', { method: 'POST', body: { username, password } });
  assert.equal(r.status, 200);
  assert.match(r.response.headers.get('set-cookie'), /HttpOnly/);
  return { ...r.data, cookie: r.response.headers.get('set-cookie').split(';')[0] };
}
const product = {
  name: 'Test bouquet ' + suffix,
  price: 123456.78,
  flower_type: 'Mawar',
  size: 'Medium',
  description: 'Integrasi transaksi',
  photo: '/assets/bouquet-rose.svg',
  active: true,
};
before(async () => {
  await migrate();
  const password = randomBytes(20).toString('hex');
  for (const role of ['admin', 'owner']) {
    const { rows } = await db.query(
      'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id',
      [role + '_' + suffix, await bcrypt.hash(password, 12), 'Test ' + role, role],
    );
    if (role === 'admin') adminId = rows[0].id;
    else ownerId = rows[0].id;
  }
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  admin = await login('admin_' + suffix, password);
  owner = await login('owner_' + suffix, password);
});
after(async () => {
  for (const id of created.orders) {
    await db.query('DELETE FROM sales WHERE order_id=$1', [id]);
    await db.query('DELETE FROM orders WHERE id=$1', [id]);
  }
  for (const id of created.recommendations)
    await db.query('DELETE FROM recommendations WHERE id=$1', [id]);
  for (const id of created.categories) await db.query('DELETE FROM categories WHERE id=$1', [id]);
  for (const id of created.products) await db.query('DELETE FROM products WHERE id=$1', [id]);
  await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])', [[adminId, ownerId]]);
  await new Promise((resolve) => server.close(resolve));
  await db.end();
  rmSync(testDirectory, { recursive: true, force: true });
});
test('database health and public catalog require no login', async () => {
  assert.equal((await request('/health')).data.database, 'PostgreSQL');
  assert.equal((await request('/products')).status, 200);
  assert.equal((await request('/categories')).status, 200);
});
test('role boundaries and CSRF are enforced in backend', async () => {
  assert.equal((await request('/orders')).status, 401);
  assert.equal((await request('/manage/products', { session: owner })).status, 403);
  assert.equal((await request('/reports', { session: admin })).status, 403);
  assert.equal(
    (await request('/manage/products', { method: 'POST', body: product, session: owner })).status,
    403,
  );
  assert.equal(
    (
      await request('/manage/products', {
        method: 'POST',
        body: product,
        session: admin,
        csrf: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (await request('/orders', { method: 'POST', body: {}, session: owner })).status,
    403,
  );
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [adminId]);
  assert.match(rows[0].password_hash, /^\$2[ab]\$/);
});
test('invalid credentials and malformed input are rejected', async () => {
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { username: 'missing_' + suffix, password: 'wrong' },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request('/manage/products', {
        method: 'POST',
        body: { ...product, price: -1 },
        session: admin,
      })
    ).status,
    422,
  );
  assert.equal((await request('/products/no-id')).status, 422);
  assert.equal(
    (await request('/reports?from=2026-02-30&to=2026-04-01', { session: owner })).status,
    422,
  );
  assert.equal(
    (await request('/reports?from=2026-10-10&to=2026-01-01', { session: owner })).status,
    422,
  );
});
test('product and category CRUD drive public recommendation filtering', async () => {
  let r = await request('/manage/products', { method: 'POST', session: admin, body: product });
  assert.equal(r.status, 201);
  const p = r.data;
  created.products.push(p.id);
  r = await request('/manage/categories', {
    method: 'POST',
    session: admin,
    body: { name: 'Test momen ' + suffix, description: 'Tes' },
  });
  assert.equal(r.status, 201);
  const c = r.data;
  created.categories.push(c.id);
  r = await request('/manage/recommendations', {
    method: 'POST',
    session: admin,
    body: { product_id: p.id, category_id: c.id, note: 'Pilihan test' },
  });
  assert.equal(r.status, 201);
  created.recommendations.push(r.data.id);
  assert.equal(
    (
      await request('/manage/recommendations', {
        method: 'POST',
        session: admin,
        body: { product_id: p.id, category_id: c.id },
      })
    ).status,
    409,
  );
  r = await request('/products?category=' + c.id);
  assert.equal(r.data.length, 1);
  assert.equal(r.data[0].id, p.id);
  r = await request('/products/' + p.id);
  assert.equal(r.data.categories[0].note, 'Pilihan test');
  assert.equal(
    (await request('/manage/products/' + p.id, { method: 'DELETE', session: admin })).status,
    409,
  );
  assert.equal(
    (await request('/manage/categories/' + c.id, { method: 'DELETE', session: admin })).status,
    409,
  );
  r = await request('/manage/products/' + p.id, {
    method: 'PUT',
    session: admin,
    body: { ...product, active: false },
  });
  assert.equal(r.status, 200);
  assert.equal((await request('/products/' + p.id)).status, 404);
  await request('/manage/products/' + p.id, { method: 'PUT', session: admin, body: product });
  await request('/manage/categories/' + c.id, {
    method: 'PUT',
    session: admin,
    body: { name: 'Updated ' + suffix, description: 'Updated' },
  });
  await request('/manage/recommendations/' + created.recommendations[0], {
    method: 'PUT',
    session: admin,
    body: { category_id: c.id, product_id: p.id, note: 'Updated' },
  });
});
test('order totals are server-derived and completion records one immutable sale', async () => {
  const p = created.products[0],
    input = {
      customer_name: 'Test Customer ' + suffix,
      phone_number: '081234567890',
      order_date: '2026-10-01',
      delivery_date: '2026-10-12',
      request: 'Test',
      items: [{ product_id: p, quantity: 2 }],
      total: 1,
    };
  let r = await request('/orders', { method: 'POST', session: admin, body: input });
  assert.equal(r.status, 201);
  const id = r.data.id;
  created.orders.push(id);
  assert.equal(Number(r.data.total), 246913.56);
  r = await request('/orders/' + id, {
    method: 'PUT',
    session: admin,
    body: { ...input, items: [{ product_id: p, quantity: 3 }] },
  });
  assert.equal(r.status, 200);
  assert.equal(Number(r.data.total), 370370.34);
  assert.equal(
    (
      await request('/orders/' + id + '/status', {
        method: 'PATCH',
        session: admin,
        body: { status: 'completed' },
      })
    ).status,
    409,
  );
  await request('/orders/' + id + '/status', {
    method: 'PATCH',
    session: admin,
    body: { status: 'processing' },
  });
  const results = await Promise.all([
    request('/orders/' + id + '/status', {
      method: 'PATCH',
      session: admin,
      body: { status: 'completed' },
    }),
    request('/orders/' + id + '/status', {
      method: 'PATCH',
      session: admin,
      body: { status: 'completed' },
    }),
  ]);
  assert.ok(results.every((r) => r.status === 200));
  const sales = await db.query('SELECT * FROM sales WHERE order_id=$1', [id]);
  assert.equal(sales.rowCount, 1);
  assert.equal(Number(sales.rows[0].total_sale), 370370.34);
  assert.equal((await request('/orders/' + id, { method: 'DELETE', session: admin })).status, 409);
  assert.equal(
    (await request('/orders/' + id, { method: 'PUT', session: admin, body: input })).status,
    409,
  );
  assert.equal(
    (
      await request('/orders/' + id + '/status', {
        method: 'PATCH',
        session: admin,
        body: { status: 'cancelled' },
      })
    ).status,
    409,
  );
  assert.equal((await request('/orders', { session: owner })).status, 200);
});
test('transaction rollback rejects nonexistent, duplicated and inactive product items', async () => {
  const baseInput = {
    customer_name: 'Invalid ' + suffix,
    phone_number: '081234567890',
    order_date: '2026-10-01',
    delivery_date: '2026-10-12',
    items: [{ product_id: 999999999, quantity: 1 }],
  };
  const before = (await db.query('SELECT count(*) FROM orders')).rows[0].count;
  assert.equal(
    (await request('/orders', { method: 'POST', session: admin, body: baseInput })).status,
    422,
  );
  assert.equal(
    (
      await request('/orders', {
        method: 'POST',
        session: admin,
        body: {
          ...baseInput,
          items: [
            { product_id: created.products[0], quantity: 1 },
            { product_id: created.products[0], quantity: 1 },
          ],
        },
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request('/orders', {
        method: 'POST',
        session: admin,
        body: { ...baseInput, delivery_date: '2026-09-01' },
      })
    ).status,
    422,
  );
  assert.equal((await db.query('SELECT count(*) FROM orders')).rows[0].count, before);
});
test('owner report uses sale dates and generates a real PDF, including empty periods', async () => {
  const report = await request('/reports?from=2026-01-01&to=2030-01-01', { session: owner });
  assert.equal(report.status, 200);
  assert.ok(report.data.rows.some((r) => r.order_id === created.orders[0]));
  const pdf = await request('/reports/pdf?from=2026-01-01&to=2030-01-01', { session: owner });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.data.length > 1000);
  const empty = await request('/reports?from=2000-01-01&to=2000-01-02', { session: owner });
  assert.equal(empty.data.count, 0);
  assert.equal(empty.data.total, 0);
  assert.equal(
    (await request('/reports/pdf?from=2000-01-01&to=2000-01-02', { session: owner })).status,
    200,
  );
});
test('dashboard reflects relational data and logout invalidates session', async () => {
  const r = await request('/dashboard', { session: owner });
  assert.equal(r.status, 200);
  assert.equal(r.data.trend.length, 7);
  assert.ok(Number(r.data.summary.products) > 0);
  assert.equal((await request('/auth/logout', { method: 'POST', session: owner })).status, 200);
  assert.equal((await request('/auth/me', { session: owner })).status, 401);
});
