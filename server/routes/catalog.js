import { storeInfo } from '../store.js';
import { z } from 'zod';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db, transaction } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
import {
  idSchema,
  productSchema,
  categorySchema,
  recommendationSchema,
  fail,
} from '../validation.js';
export const catalog = Router();
const productTypes = {
  bunga: ['bunga', 'flower', 'mawar', 'edelweiss'],
  kering: ['kering', 'dried', 'edelweiss'],
  foto: ['foto', 'photo'],
  snack: ['snack', 'makanan', 'wafer'],
  uang: ['uang'],
  akrilik: ['akrilik', 'acrylic'],
  frame: ['frame', 'mahar'],
  boneka: ['boneka', 'bear'],
  vas: ['vas'],
  klobot: ['klobot', 'kulit jagung'],
};
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
catalog.get('/product-types', async (req, res) =>
  res.json(
    (
      await db.query(
        'SELECT t.*,count(p.id)::int AS product_count FROM product_types t LEFT JOIN products p ON p.product_type_id=t.id AND p.active=true GROUP BY t.id ORDER BY t.id',
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
  const typeId = req.query.type_id ? idSchema.parse(req.query.type_id) : null;
  const type = req.query.type ? z.enum(Object.keys(productTypes)).parse(req.query.type) : null;
  const sort = z
    .enum(['recommended', 'price_asc', 'price_desc', 'popular', 'newest'])
    .parse(req.query.sort || 'recommended');
  const order = {
    recommended: 'p.id',
    price_asc: 'p.price ASC,p.id',
    price_desc: 'p.price DESC,p.id',
    popular: 'favorite_count DESC,p.updated_at DESC,p.id DESC',
    newest: 'p.updated_at DESC,p.id DESC',
  }[sort];
  res.json(
    (
      await db.query(
        `SELECT p.*,COALESCE((SELECT sum(oi.quantity) FROM order_items oi JOIN sales s ON s.order_id=oi.order_id WHERE oi.product_id=p.id),0) AS sold_count,(SELECT count(*)::int FROM product_favorites f WHERE f.product_id=p.id) AS favorite_count,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]') AS categories FROM products p WHERE p.active=true AND (p.name ILIKE $1 OR p.description ILIKE $1) AND ($2::bigint IS NULL OR EXISTS(SELECT 1 FROM recommendations r WHERE r.product_id=p.id AND r.category_id=$2)) AND ($3::numeric IS NULL OR p.price<=$3) AND ($4::numeric IS NULL OR p.price>=$4) AND ($5::text[] IS NULL OR lower(p.name || ' ' || p.flower_type) LIKE ANY($5::text[])) AND ($6::bigint IS NULL OR p.product_type_id=$6) ORDER BY ${order}`,
        [
          '%' + search + '%',
          category,
          maxPrice,
          minPrice,
          type ? productTypes[type].map((value) => `%${value}%`) : null,
          typeId,
        ],
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
    productSchema.extend({ category_ids: z.array(idSchema).max(200).optional() }),
    ['name', 'price', 'flower_type', 'size', 'description', 'photo', 'active', 'product_type_id'],
  ],
  ['categories', 'categories', categorySchema, ['name', 'description', 'photo']],
  ['product-types', 'product_types', categorySchema, ['name', 'description', 'photo']],
  [
    'recommendations',
    'recommendations',
    recommendationSchema,
    ['category_id', 'product_id', 'note'],
  ],
]) {
  management.post('/' + path, async (req, res) => {
    const body = schema.parse(req.body);
    const row = await transaction(async (client) => {
      if (
        table === 'products' &&
        body.product_type_id &&
        !(await client.query('SELECT id FROM product_types WHERE id=$1', [body.product_type_id]))
          .rowCount
      )
        fail(422, 'Jenis produk tidak ditemukan.');
      const { rows } = await client.query(
        `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
        columns.map((k) => body[k]),
      );
      if (table === 'products' && body.category_ids !== undefined)
        await syncProductCategories(client, rows[0].id, body.category_ids);
      return rows[0];
    });
    res.status(201).json(row);
  });
  management.put('/' + path + '/:id', async (req, res) => {
    const body = schema.parse(req.body),
      id = idSchema.parse(req.params.id);
    const fields = columns.filter((k) => body[k] !== undefined);
    const row = await transaction(async (client) => {
      if (
        table === 'products' &&
        body.product_type_id &&
        !(await client.query('SELECT id FROM product_types WHERE id=$1', [body.product_type_id]))
          .rowCount
      )
        fail(422, 'Jenis produk tidak ditemukan.');
      const { rows } = await client.query(
        `UPDATE ${table} SET ${fields.map((k, i) => k + '=$' + (i + 1)).join(',')}${table === 'products' ? ',updated_at=now()' : ''} WHERE id=$${fields.length + 1} RETURNING *`,
        [...fields.map((k) => body[k]), id],
      );
      if (!rows.length) fail(404, 'Data tidak ditemukan.');
      if (table === 'products' && body.category_ids !== undefined)
        await syncProductCategories(client, rows[0].id, body.category_ids);
      return rows[0];
    });
    res.json(row);
  });
  management.delete('/' + path + '/:id', async (req, res) => {
    const result = await db.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [
      idSchema.parse(req.params.id),
    ]);
    if (!result.rowCount) fail(404, 'Data tidak ditemukan.');
    res.json({ ok: true });
  });
}
async function syncProductCategories(client, productId, categoryIds) {
  const ids = [...new Set(categoryIds)];
  if (ids.length) {
    const found = await client.query('SELECT id FROM categories WHERE id=ANY($1::bigint[])', [ids]);
    if (found.rowCount !== ids.length) fail(422, 'Kategori tidak ditemukan.');
  }
  await client.query(
    'DELETE FROM recommendations WHERE product_id=$1 AND NOT (category_id=ANY($2::bigint[]))',
    [productId, ids],
  );
  for (const id of ids)
    await client.query(
      'INSERT INTO recommendations(category_id,product_id) VALUES($1,$2) ON CONFLICT(category_id,product_id) DO NOTHING',
      [id, productId],
    );
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
