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
  assert.equal((await request('/reports')).status, 401);
  assert.equal((await request('/reports/pdf')).status, 401);
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
    422,
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
test('admin and owner reports use sale dates and generate PDFs, including empty periods', async () => {
  const report = await request('/reports?from=2026-01-01&to=2030-01-01', { session: owner });
  assert.equal(report.status, 200);
  assert.ok(report.data.rows.some((r) => r.order_id === created.orders[0]));
  const adminReport = await request('/reports?from=2026-01-01&to=2030-01-01', { session: admin });
  assert.equal(adminReport.status, 200);
  assert.deepEqual(adminReport.data, report.data);
  const adminPdf = await request('/reports/pdf?from=2026-01-01&to=2030-01-01', { session: admin });
  assert.equal(adminPdf.status, 200);
  assert.equal(adminPdf.data.subarray(0, 5).toString(), '%PDF-');
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
test('WhatsApp contact is initialized once and remains editable by owner', async () => {
  const { readFile } = await import('node:fs/promises');
  assert.equal((await request('/store')).data.whatsapp, '6282380087007');
  await db.query("INSERT INTO store_settings(id,name,whatsapp) VALUES(1,'Test','628111111111')");
  try {
    await db.query(
      await readFile(new URL('../server/db/008_whatsapp_contact.sql', import.meta.url), 'utf8'),
    );
    assert.equal((await request('/store')).data.whatsapp, '628566365052');
    const store = (await request('/store')).data;
    const update = await request('/store', {
      method: 'PUT',
      session: owner,
      body: { ...store, whatsapp: '628222222222' },
    });
    assert.equal(update.status, 200);
    await migrate();
    assert.equal((await request('/store')).data.whatsapp, '628222222222');
  } finally {
    await db.query('DELETE FROM store_settings WHERE id=1');
  }
});
test('dashboard reflects relational data and logout invalidates session', async () => {
  const r = await request('/dashboard', { session: owner });
  assert.equal(r.status, 200);
  assert.equal(r.data.trend.length, 7);
  assert.ok(Number(r.data.summary.products) > 0);
  assert.equal((await request('/auth/logout', { method: 'POST', session: owner })).status, 200);
  assert.equal((await request('/auth/me', { session: owner })).status, 401);
});

test('email verification and password recovery are single-use, expiring and revoke sessions', async () => {
  const username = 'recovery_' + suffix,
    oldPassword = randomBytes(18).toString('hex'),
    newPassword = randomBytes(18).toString('hex'),
    address = 'recovery-' + suffix + '@example.com';
  const user = (
    await db.query(
      'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id',
      [username, await bcrypt.hash(oldPassword, 12), 'Recovery Test', 'admin'],
    )
  ).rows[0];
  const deliveries = [];
  app.locals.sendAccountMail = async (value) => deliveries.push(value);
  try {
    const session = await login(username, oldPassword);
    let r = await request('/auth/email/request', {
      method: 'POST',
      session,
      body: { email: address, password: oldPassword },
    });
    assert.equal(r.status, 200);
    const verify = deliveries.at(-1).text.match(/#token=([a-f0-9]{64})/)[1];
    assert.equal(
      (await request('/auth/email/verify', { method: 'POST', body: { token: verify } })).status,
      200,
    );
    assert.equal(
      (await request('/auth/email/verify', { method: 'POST', body: { token: verify } })).status,
      422,
    );
    const known = await request('/auth/forgot-password', {
        method: 'POST',
        body: { email: address },
      }),
      unknown = await request('/auth/forgot-password', {
        method: 'POST',
        body: { email: 'unknown-' + suffix + '@example.com' },
      });
    assert.deepEqual(known.data, unknown.data);
    const expired = deliveries.at(-1).text.match(/#token=([a-f0-9]{64})/)[1];
    const tokens = await db.query('SELECT token_hash FROM account_tokens WHERE user_id=$1', [
      user.id,
    ]);
    assert.notEqual(tokens.rows[0].token_hash, expired);
    await db.query(
      "UPDATE account_tokens SET expires_at=now()-interval '1 minute' WHERE user_id=$1",
      [user.id],
    );
    assert.equal(
      (
        await request('/auth/reset-password', {
          method: 'POST',
          body: { token: expired, password: newPassword },
        })
      ).status,
      422,
    );
    await request('/auth/forgot-password', { method: 'POST', body: { email: address } });
    const token = deliveries.at(-1).text.match(/#token=([a-f0-9]{64})/)[1];
    const results = await Promise.all([
      request('/auth/reset-password', { method: 'POST', body: { token, password: newPassword } }),
      request('/auth/reset-password', { method: 'POST', body: { token, password: newPassword } }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 422]);
    assert.equal((await request('/auth/me', { session })).status, 401);
    const newSession = await login(username, newPassword);
    assert.equal(newSession.role, 'admin');
    assert.equal(
      (
        await request('/auth/change-password', {
          method: 'POST',
          session: newSession,
          body: { current_password: 'wrong', password: newPassword + 'x' },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('/auth/change-password', {
          method: 'POST',
          session: newSession,
          body: { current_password: newPassword, password: newPassword + 'x' },
        })
      ).status,
      200,
    );
    assert.equal((await request('/auth/me', { session: newSession })).status, 401);

    assert.equal(
      (await request('/auth/login', { method: 'POST', body: { username, password: oldPassword } }))
        .status,
      401,
    );
  } finally {
    delete app.locals.sendAccountMail;
    await db.query('DELETE FROM users WHERE id=$1', [user.id]);
  }
});

test('owner data explorer is read-only, paginated and exports no credentials', async () => {
  const password = randomBytes(18).toString('hex'),
    username = 'data_' + suffix;
  const user = (
    await db.query(
      'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id',
      [username, await bcrypt.hash(password, 12), 'Data Test', 'owner'],
    )
  ).rows[0];
  try {
    const session = await login(username, password);
    assert.equal((await request('/data', { session: admin })).status, 403);
    assert.equal((await request('/data/users', { session })).status, 422);
    assert.equal((await request('/data/products?offset=-1', { session })).status, 422);
    const meta = await request('/data', { session });
    assert.equal(meta.status, 200);
    assert.ok('products' in meta.data.tables);
    const rows = await request('/data/products', { session });
    assert.equal(rows.status, 200);
    assert.ok(rows.data.rows.length <= 50);
    assert.equal(
      (await request('/data/export', { method: 'POST', session, body: { password: 'wrong' } }))
        .status,
      403,
    );
    const exported = await request('/data/export', { method: 'POST', session, body: { password } });
    assert.equal(exported.status, 200);
    assert.equal(exported.data.format, 'bien-vendre-business-data-v1');
    for (const forbidden of ['users', 'sessions', 'account_tokens'])
      assert.ok(!(forbidden in exported.data.data));
    assert.ok(!JSON.stringify(exported.data).includes('password_hash'));
  } finally {
    await db.query('DELETE FROM users WHERE id=$1', [user.id]);
  }
});

test('catalog budget and ordering are validated and applied in the database', async () => {
  const result = await request('/products?max_price=200000&sort=price_asc');
  assert.equal(result.status, 200);
  assert.ok(result.data.every((p) => Number(p.price) <= 200000));
  const prices = result.data.map((p) => Number(p.price));
  assert.deepEqual(
    prices,
    [...prices].sort((a, b) => a - b),
  );
  assert.equal((await request('/products?sort=unsafe')).status, 422);
  assert.equal((await request('/products?max_price=-1')).status, 422);
});

test('store settings persist publicly, customer metrics are readable by owner, and uploads validate content', async () => {
  const { default: sharp } = await import('sharp');
  const { unlink } = await import('node:fs/promises');
  const { uploadsDirectory } = await import('../server/routes/uploads.js');
  const { join, basename } = await import('node:path');
  const secret = randomBytes(18).toString('hex');
  const u = (
    await db.query(
      'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id',
      ['retail_' + suffix, await bcrypt.hash(secret, 12), 'Retail Owner', 'owner'],
    )
  ).rows[0];
  let uploaded;
  try {
    const session = await login('retail_' + suffix, secret),
      settings = {
        name: 'Retail Test Store',
        address: 'Test address',
        whatsapp: '6281234567890',
        instagram: 'https://share.google/PciYm0L1lPyb6IhXpc',
        tiktok: 'https://www.tiktok.com/@bienvendre',
        shopee: 'https://shopee.co.id/bienvendreofficial',
        tokopedia: 'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
        about_story: 'Cerita florist',
        about_service: 'Konsultasi personal',
        care_tips: 'Ganti air bunga',
        description: 'Test description',
        logo: '/assets/logo.svg',
      };
    assert.equal(
      (await request('/store', { method: 'PUT', session: admin, body: settings })).status,
      403,
    );
    assert.equal((await request('/store', { method: 'PUT', body: settings })).status, 401);
    assert.equal(
      (
        await request('/store', {
          method: 'PUT',
          session,
          body: { ...settings, instagram: 'https://evil.example/' },
        })
      ).status,
      422,
    );
    assert.equal((await request('/store', { method: 'PUT', session, body: settings })).status, 200);
    assert.deepEqual((await request('/store')).data, settings);
    assert.equal(
      (
        await request('/store', {
          method: 'PUT',
          session,
          body: { ...settings, shopee: 'https://shopee.co.id.evil.example/shop' },
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await request('/store', {
          method: 'PUT',
          session,
          body: { ...settings, tokopedia: 'https://tokopedia.com.evil.example/shop' },
        })
      ).status,
      422,
    );
    const customer = await request('/customers', { session });
    assert.equal(customer.status, 200);
    assert.ok(Number(customer.data.summary.customers) >= 1);
    assert.ok(customer.data.rows.some((c) => c.name === 'Test Customer ' + suffix));
    assert.equal((await request('/customers')).status, 401);
    assert.equal(
      (await request('/track', { method: 'POST', body: { code: '0'.repeat(32) } })).status,
      404,
    );
    const range = await request('/products?min_price=100000&max_price=150000');
    assert.ok(range.data.some((p) => p.id === created.products[0]));
    assert.ok(range.data.every((p) => Number(p.price) >= 100000 && Number(p.price) <= 150000));
    assert.equal((await request('/products?min_price=200000&max_price=100000')).status, 422);
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#abcabc' },
    })
      .png()
      .toBuffer();
    async function upload(bytes, mime, s = admin) {
      const form = new FormData();
      form.append('photo', new Blob([bytes], { type: mime }), '../../photo.png');
      return fetch(base + '/api/uploads', {
        method: 'POST',
        headers: { Cookie: s.cookie, 'X-CSRF-Token': s.csrf_token },
        body: form,
      });
    }
    const ownerPhoto = await upload(image, 'image/png', session);
    assert.equal(ownerPhoto.status, 201);
    const ownerUrl = (await ownerPhoto.json()).url;
    await unlink(join(uploadsDirectory, basename(ownerUrl)));
    assert.equal(
      (await upload(Buffer.from('<svg><script>alert(1)</script></svg>'), 'image/png')).status,
      422,
    );
    assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).status, 413);
    const photo = await upload(image, 'image/png');
    assert.equal(photo.status, 201);
    uploaded = (await photo.json()).url;
    assert.match(uploaded, /^\/uploads\/[a-f0-9-]{36}\.webp$/);
    const download = await fetch(base + uploaded);
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-type'), /image\/webp/);
    assert.ok((await download.arrayBuffer()).byteLength > 0);
    const report = await request('/reports?from=2026-01-01&to=2030-01-01', { session });
    assert.ok(report.data.trend.length > 0);
    assert.equal(
      report.data.trend.reduce((n, x) => n + Number(x.total), 0),
      report.data.total,
    );
    for (let i = 0; i < 45; i++) {
      const o = (
        await db.query(
          "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,created_by,status) VALUES($1,'08111111111','2020-01-01','2020-01-02',1000,$2,'completed') RETURNING id",
          ['PDF Customer ' + suffix + ' ' + 'Long customer name '.repeat(3), adminId],
        )
      ).rows[0];
      created.orders.push(o.id);
      await db.query(
        "INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,'2020-01-02',1000)",
        [o.id],
      );
    }
    const multipage = await request('/reports/pdf?from=2020-01-01&to=2020-01-03', { session });
    assert.equal(multipage.status, 200);
    assert.ok((multipage.data.toString('latin1').match(/\/Type \/Page\b/g) || []).length >= 2);
  } finally {
    if (uploaded) await unlink(join(uploadsDirectory, basename(uploaded)));
    await db.query('DELETE FROM store_settings WHERE id=1');
    await db.query('DELETE FROM users WHERE id=$1', [u.id]);
  }
});

test('favorites are idempotent, persisted per visitor, and visible in catalog and admin', async () => {
  const visitor = 'ca7f843a-67da-49c8-a1c9-6ef44475e391';
  const id = created.products[0];
  const first = await request('/favorites/' + id, {
    method: 'PUT',
    body: { visitor, favorite: true },
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.count, 1);
  assert.equal(
    (await request('/favorites/' + id, { method: 'PUT', body: { visitor, favorite: true } })).data
      .count,
    1,
  );
  assert.ok((await request('/favorites/' + visitor)).data.includes(String(id)));
  const dashboard = (await request('/dashboard', { session: admin })).data;
  assert.equal(dashboard.popular[0].id, id);
  assert.equal(dashboard.popular[0].favorite_count, 1);
  assert.equal(
    (await request('/products?sort=popular')).data.find((p) => p.id === id).favorite_count,
    1,
  );
  assert.equal(
    (await request('/manage/products', { session: admin })).data.find((p) => p.id === id)
      .favorite_count,
    1,
  );
  assert.equal(
    (await request('/favorites/' + id, { method: 'PUT', body: { visitor, favorite: false } })).data
      .count,
    0,
  );
});

test('newest order reflects product edits', async () => {
  const id = created.products[0];
  const existing = (await request('/manage/products', { session: admin })).data.find(
    (p) => p.id === id,
  );
  const body = {
    name: existing.name,
    price: Number(existing.price),
    flower_type: existing.flower_type,
    size: existing.size,
    description: existing.description,
    photo: existing.photo,
    active: existing.active,
  };
  assert.equal(
    (await request('/manage/products/' + id, { method: 'PUT', session: admin, body })).status,
    200,
  );
  assert.equal((await request('/products?sort=newest')).data[0].id, id);
});

test('legacy processing becomes unfinished while cancelled and completed history stays unchanged', async () => {
  const { readFile } = await import('node:fs/promises');
  const legacy = [];
  try {
    for (const status of ['processing', 'cancelled', 'completed']) {
      const result = await db.query(
        "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,created_by,status) VALUES('Legacy','08123456789','2026-01-01','2026-01-02',1000,$1,$2) RETURNING id",
        [adminId, status],
      );
      legacy.push(result.rows[0].id);
    }
    await db.query(
      await readFile(new URL('../server/db/006_order_status.sql', import.meta.url), 'utf8'),
    );
    const rows = (
      await db.query('SELECT status FROM orders WHERE id=ANY($1::bigint[]) ORDER BY id', [legacy])
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.status),
      ['pending', 'cancelled', 'completed'],
    );
  } finally {
    for (const id of legacy) await db.query('DELETE FROM orders WHERE id=$1', [id]);
  }
});
