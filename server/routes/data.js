import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../auth.js';
import { db, transaction } from '../db/pool.js';
import { fail } from '../validation.js';
const tables = {
  products: 'id,name,price,flower_type,size,description,photo,active',
  categories: 'id,name,description,photo',
  recommendations: 'id,category_id,product_id,note',
  orders: 'id,customer_name,phone_number,order_date,delivery_date,request,status,total',
  order_items: 'id,order_id,product_id,product_name,quantity,price,subtotal',
  sales: 'id,order_id,sale_date,total_sale',
};
export const dataStudio = Router();
dataStudio.use(authenticate, authorize('owner'));
dataStudio.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
dataStudio.get('/', async (req, res) => {
  const counts = {};
  for (const table of Object.keys(tables))
    counts[table] = Number(
      (await db.query(`SELECT count(*) AS count FROM ${table}`)).rows[0].count,
    );
  res.json({ tables: counts });
});
dataStudio.get('/:table', async (req, res) => {
  const table = z.enum(Object.keys(tables)).parse(req.params.table),
    offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000000)
      .parse(req.query.offset || 0);
  res.json({
    rows: (
      await db.query(`SELECT ${tables[table]} FROM ${table} ORDER BY id LIMIT 50 OFFSET $1`, [
        offset,
      ])
    ).rows,
    offset,
    limit: 50,
  });
});
dataStudio.post('/export', async (req, res) => {
  const password = z.string().min(1).max(128).parse(req.body.password);
  const user = (await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]))
    .rows[0];
  if (!(await bcrypt.compare(password, user.password_hash))) fail(403, 'Password saat ini salah.');
  const data = await transaction(async (client) => {
    const result = {};
    for (const table of Object.keys(tables))
      result[table] = (
        await client.query(`SELECT ${tables[table]} FROM ${table} ORDER BY id`)
      ).rows;
    return result;
  });
  res
    .set('Content-Disposition', 'attachment; filename="bien-vendre-data.json"')
    .json({ format: 'bien-vendre-business-data-v1', exported_at: new Date().toISOString(), data });
});
