import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { transfer } from '../server/db/transfer.js';

test('import preserves relations, hashes, amounts and resets identity sequences; refuses nonempty targets', async () => {
  const source = await PGlite.create();
  const target = await PGlite.create();
  try {
    const schema = await readFile(new URL('../server/db/001_initial.sql', import.meta.url), 'utf8');
    await source.exec(schema);
    await target.exec(schema);
    await source.exec(`
      INSERT INTO users(id,username,password_hash,name,role) OVERRIDING SYSTEM VALUE VALUES(10,'import-user','hash-preserved','Import User','admin');
      INSERT INTO categories(id,name) OVERRIDING SYSTEM VALUE VALUES(20,'Import Category');
      INSERT INTO products(id,name,price,flower_type,size,description) OVERRIDING SYSTEM VALUE VALUES(30,'Import Product',123456.78,'Mawar','M','Imported');
      INSERT INTO recommendations(id,category_id,product_id) OVERRIDING SYSTEM VALUE VALUES(40,20,30);
      INSERT INTO orders(id,customer_name,phone_number,order_date,delivery_date,total,created_by,status) OVERRIDING SYSTEM VALUE VALUES(50,'Import Customer','08123456789','2026-10-01','2026-10-02',246913.56,10,'completed');
      INSERT INTO order_items(id,order_id,product_id,product_name,quantity,price) OVERRIDING SYSTEM VALUE VALUES(60,50,30,'Import Product',2,123456.78);
      INSERT INTO sales(id,order_id,sale_date,total_sale) OVERRIDING SYSTEM VALUE VALUES(70,50,'2026-10-02',246913.56);
    `);
    await source.transaction(async (reader) => {
      const counts = await target.transaction((writer) => transfer(reader, writer));
      assert.equal(counts.users, 1);
      assert.equal(counts.sales, 1);
    });
    assert.equal(
      (await target.query('SELECT password_hash FROM users')).rows[0].password_hash,
      'hash-preserved',
    );
    assert.equal(
      Number((await target.query('SELECT subtotal FROM order_items')).rows[0].subtotal),
      246913.56,
    );
    assert.equal((await target.query('SELECT count(*) AS count FROM sessions')).rows[0].count, 0);
    const product = await target.query(
      "INSERT INTO products(name,price,flower_type,size,description) VALUES('Next',1,'Mawar','S','Next') RETURNING id",
    );
    assert.equal(product.rows[0].id, 31);
    await assert.rejects(
      target.transaction((writer) => transfer(source, writer)),
      /harus kosong/,
    );
    assert.equal((await target.query('SELECT count(*) AS count FROM users')).rows[0].count, 1);
  } finally {
    await source.close();
    await target.close();
  }
});

test('file database persists on restart; backup restores into a new directory and refuses overwrite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bien-vendre-storage-'));
  const sourcePath = join(directory, 'source');
  let source;
  try {
    source = await PGlite.create(sourcePath);
    await source.exec(
      await readFile(new URL('../server/db/001_initial.sql', import.meta.url), 'utf8'),
    );
    await source.query(
      "INSERT INTO products(name,price,flower_type,size,description) VALUES('Persistent',1000,'Mawar','M','Persistence test')",
    );
    await source.close();
    source = await PGlite.create(sourcePath);
    assert.equal((await source.query('SELECT name FROM products')).rows[0].name, 'Persistent');
    const backup = join(directory, 'backup.tar.gz');
    await writeFile(backup, Buffer.from(await (await source.dumpDataDir('gzip')).arrayBuffer()));
    await source.close();
    source = null;
    const target = join(directory, 'restored');
    const result = spawnSync(process.execPath, ['scripts/restore-db.js', backup, target], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const restored = await PGlite.create(target);
    try {
      assert.equal((await restored.query('SELECT name FROM products')).rows[0].name, 'Persistent');
    } finally {
      await restored.close();
    }
    const second = spawnSync(process.execPath, ['scripts/restore-db.js', backup, target], {
      encoding: 'utf8',
    });
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /sudah ada/);
  } finally {
    if (source) await source.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('local database rejects a second writer while the owner process is alive', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bien-vendre-lock-'));
  const path = join(directory, 'database');
  try {
    await writeFile(path + '.lock', JSON.stringify({ pid: process.pid, token: 'test-owner' }));
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const {db}=await import('./server/db/pool.js');await db.end();",
      ],
      { encoding: 'utf8', env: { ...process.env, DB_DRIVER: 'pglite', DB_DIRECTORY: path } },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /sedang dipakai/);
    assert.equal(JSON.parse(await readFile(path + '.lock', 'utf8')).token, 'test-owner');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
