import { db } from '../server/db/pool.js';
try {
  for (const table of [
    'users',
    'categories',
    'products',
    'recommendations',
    'orders',
    'order_items',
    'sales',
  ]) {
    const result = await db.query(`SELECT count(*) AS count FROM ${table}`);
    console.log(table + ': ' + result.rows[0].count + ' baris');
  }
  console.table((await db.query('SELECT id,name,price,active FROM products ORDER BY id')).rows);
} finally {
  await db.end();
}
