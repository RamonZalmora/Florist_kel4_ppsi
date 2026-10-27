import { storeInfo } from '../store.js';
import { z } from 'zod';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
import {
  idSchema,
  productSchema,
  categorySchema,
  recommendationSchema,
  fail,
} from '../validation.js';
export const catalog = Router();
catalog.get('/store', async (req, res) => res.json(await storeInfo()));
catalog.get('/categories', async (req, res) =>
  res.json(
    (
      await db.query(
        'SELECT c.*,count(p.id)::int AS product_count FROM categories c LEFT JOIN recommendations r ON r.category_id=c.id LEFT JOIN products p ON p.id=r.product_id AND p.active=true GROUP BY c.id ORDER BY c.id',
      )
    ).rows,
  ),
);
catalog.get('/products', async (req, res) => {
  const search = String(req.query.search || '').slice(0, 120),
    category = req.query.category ? idSchema.parse(req.query.category) : null;
  const maxPrice = req.query.max_price
    ? z.coerce.number().positive().max(1000000000).parse(req.query.max_price)
    : null;
  const minPrice = req.query.min_price
    ? z.coerce.number().min(0).max(1000000000).parse(req.query.min_price)
    : null;
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice)
    fail(422, 'Harga minimum tidak boleh melebihi harga maksimum.');
  const sort = z
    .enum(['recommended', 'price_asc', 'price_desc', 'popular'])
    .parse(req.query.sort || 'recommended');
  const order = {
    recommended: 'p.id',
    price_asc: 'p.price ASC,p.id',
    price_desc: 'p.price DESC,p.id',
    popular: 'favorite_count DESC,p.id',
  }[sort];
  res.json(
    (
      await db.query(
        `SELECT p.*,(SELECT count(*)::int FROM product_favorites f WHERE f.product_id=p.id) AS favorite_count,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]') AS categories FROM products p WHERE p.active=true AND (p.name ILIKE $1 OR p.description ILIKE $1) AND ($2::bigint IS NULL OR EXISTS(SELECT 1 FROM recommendations r WHERE r.product_id=p.id AND r.category_id=$2)) AND ($3::numeric IS NULL OR p.price<=$3) AND ($4::numeric IS NULL OR p.price>=$4) ORDER BY ${order}`,
        ['%' + search + '%', category, maxPrice, minPrice],
      )
    ).rows,
  );
});
catalog.get('/products/:id', async (req, res) => {
  const { rows } = await db.query(
    "SELECT p.*,(SELECT count(*)::int FROM product_favorites f WHERE f.product_id=p.id) AS favorite_count,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name,'note',r.note)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]') AS categories FROM products p WHERE p.id=$1 AND p.active=true",
    [idSchema.parse(req.params.id)],
  );
  if (!rows.length) fail(404, 'Produk tidak ditemukan.');
  res.json(rows[0]);
});
const favoriteLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
catalog.get('/favorites/:visitor', async (req, res) => {
  const visitor = z.string().uuid().parse(req.params.visitor);
  res.json(
    (
      await db.query('SELECT product_id FROM product_favorites WHERE visitor_id=$1', [visitor])
    ).rows.map((r) => String(r.product_id)),
  );
});
catalog.put('/favorites/:id', favoriteLimiter, async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { visitor, favorite } = z
    .object({ visitor: z.string().uuid(), favorite: z.boolean() })
    .parse(req.body);
  if (favorite) {
    const result = await db.query(
      'INSERT INTO product_favorites(product_id,visitor_id) SELECT id,$2 FROM products WHERE id=$1 AND active=true ON CONFLICT DO NOTHING RETURNING product_id',
      [id, visitor],
    );
    if (
      !result.rowCount &&
      !(await db.query('SELECT id FROM products WHERE id=$1 AND active=true', [id])).rowCount
    )
      fail(404, 'Produk tidak ditemukan.');
  } else
    await db.query('DELETE FROM product_favorites WHERE product_id=$1 AND visitor_id=$2', [
      id,
      visitor,
    ]);
  const count = (
    await db.query('SELECT count(*)::int AS count FROM product_favorites WHERE product_id=$1', [id])
  ).rows[0].count;
  res.json({ favorite, count });
});
export const management = Router();
management.use(authenticate, authorize('admin'));
management.get('/products', async (req, res) =>
  res.json(
    (
      await db.query(
        'SELECT p.*,(SELECT count(*)::int FROM product_favorites f WHERE f.product_id=p.id) AS favorite_count FROM products p ORDER BY p.id DESC',
      )
    ).rows,
  ),
);
for (const [path, table, schema, columns] of [
  [
    'products',
    'products',
    productSchema,
    ['name', 'price', 'flower_type', 'size', 'description', 'photo', 'active'],
  ],
  ['categories', 'categories', categorySchema, ['name', 'description', 'photo']],
  [
    'recommendations',
    'recommendations',
    recommendationSchema,
    ['category_id', 'product_id', 'note'],
  ],
]) {
  management.post('/' + path, async (req, res) => {
    const body = schema.parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
      columns.map((k) => body[k]),
    );
    res.status(201).json(rows[0]);
  });
  management.put('/' + path + '/:id', async (req, res) => {
    const body = schema.parse(req.body),
      id = idSchema.parse(req.params.id);
    const { rows } = await db.query(
      `UPDATE ${table} SET ${columns.map((k, i) => k + '=$' + (i + 1)).join(',')} WHERE id=$${columns.length + 1} RETURNING *`,
      [...columns.map((k) => body[k]), id],
    );
    if (!rows.length) fail(404, 'Data tidak ditemukan.');
    res.json(rows[0]);
  });
  management.delete('/' + path + '/:id', async (req, res) => {
    const result = await db.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [
      idSchema.parse(req.params.id),
    ]);
    if (!result.rowCount) fail(404, 'Data tidak ditemukan.');
    res.json({ ok: true });
  });
}
management.get('/recommendations', async (req, res) =>
  res.json(
    (
      await db.query(
        'SELECT r.*,p.name AS product_name,p.photo,p.active,c.name AS category_name FROM recommendations r JOIN products p ON p.id=r.product_id JOIN categories c ON c.id=r.category_id ORDER BY r.id DESC',
      )
    ).rows,
  ),
);
