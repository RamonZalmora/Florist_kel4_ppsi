import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { unzipSync, strFromU8 } from 'fflate';

const directory = mkdtempSync(join(tmpdir(), 'bien-sales-report-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(directory, 'database');
process.env.NODE_ENV = 'test';
const { db } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { app } = await import('../server/index.js');
let server, base, admin, owner, categoryA, categoryB, typeA, typeB, today;
const fixtures = [];
async function request(path, session = admin) {
  const response = await fetch(base + '/api/reports' + path, {
    headers: session ? { Cookie: session.cookie } : {},
  });
  const data = (response.headers.get('content-type') || '').includes('json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, response };
}
before(async () => {
  await migrate();
  const password = 'Report fixture password';
  let adminId;
  for (const role of ['admin', 'owner']) {
    const row = (
      await db.query(
        'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id',
        [role, await bcrypt.hash(password, 4), role, role],
      )
    ).rows[0];
    if (role === 'admin') adminId = row.id;
  }
  categoryA = (await db.query("INSERT INTO categories(name) VALUES('Report Wedding') RETURNING id"))
    .rows[0].id;
  categoryB = (
    await db.query("INSERT INTO categories(name) VALUES('Report Birthday') RETURNING id")
  ).rows[0].id;
  [typeA, typeB] = (await db.query('SELECT id FROM product_types ORDER BY id LIMIT 2')).rows.map(
    (row) => row.id,
  );
  const products = [];
  for (const [name, price, type, category] of [
    ['A', 10000.25, typeA, categoryA],
    ['B', 5000.5, typeB, categoryB],
  ]) {
    const id = (
      await db.query(
        "INSERT INTO products(name,price,flower_type,size,description,product_type_id) VALUES($1,$2,'Mawar','M','Report fixture',$3) RETURNING id",
        ['Report product ' + name, price, type],
      )
    ).rows[0].id;
    products.push({ id, price });
    await db.query('INSERT INTO recommendations(product_id,category_id) VALUES($1,$2)', [
      id,
      category,
    ]);
  }
  today = (await db.query("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS day")).rows[0]
    .day;
  const offsets = [0, 1, 6, 7, 29, 30, 31, 60, 90, 100, 110, 120, 130, 140, 150, 160];
  for (let index = 0; index < offsets.length; index++) {
    const chosen = index === 0 ? products : index === 1 ? [products[1]] : [products[0]];
    const quantity = (index % 3) + 1;
    const cents = chosen.reduce(
      (sum, product) => sum + Math.round(product.price * 100) * quantity,
      0,
    );
    const name =
      index === 15
        ? '=HYPERLINK("https://example.com","x")'
        : index === 2
          ? 'Report Fixture ' + 'Long name '.repeat(10)
          : 'Report Fixture ' + index;
    const orderId = (
      await db.query(
        "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,status,created_by) VALUES($1,$2,'2020-01-01','2020-01-01',$3,'completed',$4) RETURNING id",
        [name, '08123456780' + (index % 3), cents / 100, adminId],
      )
    ).rows[0].id;
    for (const product of chosen)
      await db.query(
        'INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES($1,$2,$3,$4,$5)',
        [orderId, product.id, 'Report product ' + product.id, quantity, product.price],
      );
    const sale = (
      await db.query(
        "INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,(now() AT TIME ZONE 'Asia/Jakarta')::date-$2::int,$3) RETURNING id,sale_date::text AS day",
        [orderId, offsets[index], cents / 100],
      )
    ).rows[0];
    fixtures.push({ id: sale.id, orderId, name, day: sale.day, cents });
  }
  // A malformed historical sales link must not turn an unfinished order into a completed sale.
  const pending = (
    await db.query(
      "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,total,created_by) VALUES('Unfinished fixture','081234567899','2020-01-01','2020-01-01',999,$1) RETURNING id",
      [adminId],
    )
  ).rows[0].id;
  await db.query(
    "INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,(now() AT TIME ZONE 'Asia/Jakarta')::date,999)",
    [pending],
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
    const session = { cookie: response.headers.get('set-cookie').split(';')[0] };
    if (role === 'admin') admin = session;
    else owner = session;
  }
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await db.end();
  rmSync(directory, { recursive: true, force: true });
});

test('report summaries and trends cover all completed sales while history is paginated for both roles', async () => {
  const total = fixtures.reduce((sum, row) => sum + row.cents, 0) / 100;
  for (const session of [admin, owner]) {
    const report = await request('/workspace?period=all', session);
    assert.equal(report.status, 200);
    assert.equal(report.data.count, 16);
    assert.equal(report.data.rows.length, 7);
    assert.equal(report.data.pages, 3);
    assert.equal(report.data.total, total);
    assert.equal(report.data.customers, 3);
    assert.ok(Math.abs(report.data.average - total / 16) < 0.00001);
    assert.equal(
      report.data.trend.reduce((sum, row) => sum + row.count, 0),
      16,
    );
    assert.ok(
      Math.abs(report.data.trend.reduce((sum, row) => sum + Number(row.total), 0) - total) <
        0.00001,
    );
    assert.equal((await request('/workspace?period=all&page=2', session)).data.rows.length, 7);
    const last = (await request('/workspace?period=all&page=999', session)).data;
    assert.equal(last.page, 3);
    assert.equal(last.rows.length, 2);
    const full = (await request('?period=all', session)).data;
    assert.equal(full.rows.length, 16);
    assert.equal(full.total, total);
  }
});
test('weekly, monthly, custom, search, ordering and category/type filters use sale dates and avoid join duplicates', async () => {
  const weekly = (await request('/workspace?period=7')).data;
  assert.equal(weekly.count, 3);
  assert.equal(weekly.trend.length, 7);
  assert.equal(weekly.interval, 'day');
  const monthly = (await request('/workspace?period=month')).data;
  assert.equal(
    monthly.count,
    fixtures.filter((row) => row.day >= today.slice(0, 7) + '-01' && row.day <= today).length,
  );
  const category = (await request('/workspace?period=all&category=' + categoryA + '&type=' + typeA))
    .data;
  assert.equal(category.count, 15);
  const other = (await request('/workspace?period=all&category=' + categoryB + '&type=' + typeB))
    .data;
  assert.equal(other.count, 2);
  assert.equal(
    (await request('/workspace?period=all&category=' + categoryA + '&type=' + typeB)).data.count,
    0,
  );
  const byCode = (
    await request('/workspace?period=all&q=BV-' + String(fixtures[0].orderId).padStart(4, '0'))
  ).data;
  assert.equal(byCode.count, 1);
  const highest = (await request('/workspace?period=all&sort=highest')).data;
  assert.equal(
    Number(highest.rows[0].total_sale),
    Math.max(...fixtures.map((row) => row.cents / 100)),
  );
  const empty = (await request('/workspace?period=custom&from=2000-01-01&to=2000-01-02')).data;
  assert.equal(empty.count, 0);
  assert.equal(empty.total, 0);
  assert.equal(empty.average, 0);
  assert.equal(empty.customers, 0);
  assert.equal(empty.highest, null);
  assert.deepEqual(empty.rows, []);
});

function archive(buffer) {
  return Object.fromEntries(
    Object.entries(unzipSync(new Uint8Array(buffer))).map(([name, value]) => [
      name,
      strFromU8(value),
    ]),
  );
}
function cellValue(xml, address) {
  const cells = Array.from(xml.matchAll(/<c\b([^>]*?)(?<!\/)>([\s\S]*?)<\/c>/g));
  const cell = cells.find(([, attrs]) => new RegExp('\\br="' + address + '"').test(attrs));
  assert.ok(cell, 'Missing cell ' + address);
  return { attributes: cell[1], value: cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1], xml: cell[2] };
}
test('Excel and PDF exports contain every filtered transaction, typed values, frozen headers and no executable customer formulas', async () => {
  const query = 'period=all&category=' + categoryA + '&type=' + typeA + '&sort=highest&page=2';
  const full = (await request('?' + query)).data;
  for (const session of [admin, owner]) {
    const excel = await request('/excel?' + query, session);
    assert.equal(excel.status, 200);
    assert.match(excel.response.headers.get('content-type'), /spreadsheetml/);
    assert.match(excel.response.headers.get('content-disposition'), /\.xlsx/);
    const zip = archive(excel.data);
    assert.match(zip['xl/workbook.xml'], /name="Ringkasan"/);
    assert.match(zip['xl/workbook.xml'], /name="Riwayat"/);
    const detail = zip['xl/worksheets/sheet2.xml'];
    assert.match(detail, /<autoFilter ref="A6:F21"/);
    assert.match(detail, /ySplit="6"/);
    assert.doesNotMatch(detail, /<f[ >]/);
    assert.match(zip['xl/styles.xml'], /Rp/);
    assert.match(zip['xl/styles.xml'], /dd mmm yyyy/);
    assert.equal(Number(cellValue(zip['xl/worksheets/sheet1.xml'], 'D6').value), 15);
    let total = 0;
    for (let index = 0; index < full.rows.length; index++) {
      const row = index + 7;
      assert.equal(Number(cellValue(detail, 'F' + row).value), Number(full.rows[index].total_sale));
      total += Number(cellValue(detail, 'F' + row).value);
      assert.match(cellValue(detail, 'E' + row).attributes, /t="(?:s|inlineStr|str)"/);
      assert.match(cellValue(detail, 'D' + row).attributes, /t="(?:s|inlineStr|str)"/);
      const serial =
        (Date.parse(full.rows[index].sale_date + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000;
      assert.equal(Number(cellValue(detail, 'C' + row).value), serial);
    }
    assert.ok(Math.abs(total - full.total) < 0.00001);
    assert.equal(Number(cellValue(detail, 'F22').value), full.total);
    assert.equal(Number(cellValue(zip['xl/worksheets/sheet1.xml'], 'D5').value), full.total);
    const pdf = await request('/pdf?' + query, session);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
    assert.ok((pdf.data.toString('latin1').match(/\/Type \/Page\b/g) || []).length >= 2);
  }
  const empty = await request('/excel?from=2000-01-01&to=2000-01-02');
  assert.equal(empty.status, 200);
  const emptyZip = archive(empty.data);
  assert.match(emptyZip['xl/worksheets/sheet2.xml'], /<autoFilter ref="A6:F6"/);
  assert.equal(Number(cellValue(emptyZip['xl/worksheets/sheet1.xml'], 'D6').value), 0);
});
test('all report formats require authentication and validate filters', async () => {
  for (const endpoint of ['/workspace', '/pdf', '/excel'])
    assert.equal((await request(endpoint, null)).status, 401);
  for (const query of [
    'period=365',
    'period=custom&from=2026-02-30&to=2026-04-01',
    'from=2026-12-01&to=2026-01-01',
    'category=1%20OR%201=1',
    'page=0',
  ]) {
    assert.equal((await request('/workspace?' + query)).status, 422);
    assert.equal((await request('/excel?' + query)).status, 422);
    assert.equal((await request('/pdf?' + query)).status, 422);
  }
});
