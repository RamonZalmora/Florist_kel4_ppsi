import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
const directory = mkdtempSync(join(tmpdir(), 'birthday-test-'));
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(directory, 'database');
const { db, transaction } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { addDemoBouquets } = await import('../server/db/demo-bouquets.js');
test('new birthday examples are categorized and changes preserve edited demo products', async () => {
  try {
    await migrate();
    await transaction(addDemoBouquets);
    const examples = (
      await db.query(
        "SELECT p.* FROM products p JOIN recommendations r ON r.product_id=p.id JOIN categories c ON c.id=r.category_id WHERE c.name='Ulang Tahun' AND p.photo LIKE '/assets/birthdays/%'",
      )
    ).rows;
    assert.equal(examples.length, 5);
    for (const p of examples) await readFile(new URL('../web/public' + p.photo, import.meta.url));
    await db.query(
      "INSERT INTO schema_migrations(version) VALUES('demo-bouquet-2') ON CONFLICT DO NOTHING",
    );
    const params = [
      'Blushing Rose',
      325000,
      'Mawar pink',
      'Medium',
      'Rangkaian bunga untuk melengkapi momen istimewa Anda.',
      '/assets/bouquets/bouquet-02.webp',
    ];
    const untouched = (
      await db.query(
        'INSERT INTO products(name,price,flower_type,size,description,photo) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        params,
      )
    ).rows[0].id;
    const edited = (
      await db.query(
        'INSERT INTO products(name,price,flower_type,size,description,photo) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [params[0], 999999, ...params.slice(2)],
      )
    ).rows[0].id;
    const favorited = (
      await db.query(
        'INSERT INTO products(name,price,flower_type,size,description,photo) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        params,
      )
    ).rows[0].id;
    await db.query(
      "INSERT INTO product_favorites(product_id, visitor_id) VALUES($1,'ca7f843a-67da-49c8-a1c9-6ef44475e391')",
      [favorited],
    );
    await db.query(
      await readFile(new URL('../server/db/007_birthday_examples.sql', import.meta.url), 'utf8'),
    );
    const rows = (
      await db.query('SELECT id,name,price FROM products WHERE id=ANY($1::bigint[]) ORDER BY id', [
        [untouched, edited, favorited],
      ])
    ).rows;
    assert.equal(rows[0].name, 'Birthday Rose Box');
    assert.equal(rows[1].name, 'Blushing Rose');
    assert.equal(Number(rows[1].price), 999999);
    assert.equal(rows[2].name, 'Blushing Rose');
  } finally {
    await db.end();
    rmSync(directory, { recursive: true, force: true });
  }
});
