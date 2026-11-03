import { z } from 'zod';
import { db } from '../db/pool.js';
import { idSchema } from '../validation.js';

const filtersSchema = z.object({
  period: z.enum(['all', '7', 'month']).default('all'),
  status: z.enum(['all', 'pending', 'completed']).default('all'),
  due: z.enum(['all', 'today', 'overdue']).default('all'),
  category: z.union([z.literal('none'), idSchema]).optional(),
  type: z.union([z.literal('none'), idSchema]).optional(),
  q: z.string().trim().max(120).default(''),
  sort: z.enum(['newest', 'delivery']).default('newest'),
  page: z.coerce.number().int().positive().max(100000).default(1),
});

export async function orderWorkspace(req, res) {
  const filters = filtersSchema.parse(req.query);
  const values = [];
  const bind = (value) => {
    values.push(value);
    return '$' + values.length;
  };
  const currentDay = "(now() AT TIME ZONE 'Asia/Jakarta')::date";
  const where = ["o.status <> 'cancelled'"];
  if (filters.period !== 'all') {
    const start =
      filters.period === '7' ? currentDay + '-6' : `date_trunc('month',${currentDay})::date`;
    where.push(`o.order_date BETWEEN ${start} AND ${currentDay}`);
  }
  if (filters.status === 'pending') where.push("o.status IN ('pending','processing')");
  if (filters.status === 'completed') where.push("o.status='completed'");
  if (filters.due !== 'all')
    where.push(
      `o.status IN ('pending','processing') AND o.delivery_date ${filters.due === 'today' ? '=' : '<'} ${currentDay}`,
    );
  if (filters.q) {
    const term = bind('%' + filters.q + '%');
    where.push(
      `(o.customer_name ILIKE ${term} OR o.phone_number ILIKE ${term} OR ('BV-' || lpad(o.id::text,greatest(4,length(o.id::text)),'0')) ILIKE ${term} OR EXISTS(SELECT 1 FROM order_items search_item WHERE search_item.order_id=o.id AND search_item.product_name ILIKE ${term}))`,
    );
  }
  if (filters.category !== undefined || filters.type !== undefined) {
    const productWhere = ['i.order_id=o.id'];
    if (filters.category === 'none')
      productWhere.push('NOT EXISTS(SELECT 1 FROM recommendations r WHERE r.product_id=p.id)');
    else if (filters.category !== undefined)
      productWhere.push(
        `EXISTS(SELECT 1 FROM recommendations r WHERE r.product_id=p.id AND r.category_id=${bind(filters.category)})`,
      );
    if (filters.type === 'none') productWhere.push('p.product_type_id IS NULL');
    else if (filters.type !== undefined)
      productWhere.push(`p.product_type_id=${bind(filters.type)}`);
    where.push(
      `EXISTS(SELECT 1 FROM order_items i JOIN products p ON p.id=i.product_id WHERE ${productWhere.join(' AND ')})`,
    );
  }
  const scoped = `SELECT o.* FROM orders o WHERE ${where.join(' AND ')}`;
  const [summary, trend] = await Promise.all([
    db.query(
      `WITH filtered AS (${scoped}) SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status='completed')::int AS completed,
      count(*) FILTER (WHERE status IN ('pending','processing'))::int AS pending,
      count(*) FILTER (WHERE status IN ('pending','processing') AND delivery_date=${currentDay})::int AS due_today,
      count(*) FILTER (WHERE status IN ('pending','processing') AND delivery_date<${currentDay})::int AS overdue,
      COALESCE(sum(total) FILTER (WHERE status='completed'),0) AS completed_value FROM filtered`,
      values,
    ),
    filters.period === 'all'
      ? db.query(
          `WITH filtered AS (${scoped}) SELECT to_char(date_trunc('month',order_date),'YYYY-MM-DD') AS day,
          count(*) FILTER (WHERE status='completed')::int AS completed,
          count(*) FILTER (WHERE status IN ('pending','processing'))::int AS pending
          FROM filtered GROUP BY date_trunc('month',order_date) ORDER BY date_trunc('month',order_date)`,
          values,
        )
      : db.query(
          `WITH filtered AS (${scoped}), days AS (SELECT generate_series(${filters.period === '7' ? currentDay + '-6' : `date_trunc('month',${currentDay})::date`},${currentDay},'1 day'::interval)::date AS day)
          SELECT to_char(d.day,'YYYY-MM-DD') AS day,
          count(f.id) FILTER (WHERE f.status='completed')::int AS completed,
          count(f.id) FILTER (WHERE f.status IN ('pending','processing'))::int AS pending
          FROM days d LEFT JOIN filtered f ON f.order_date=d.day GROUP BY d.day ORDER BY d.day`,
          values,
        ),
  ]);
  const pageSize = 7;
  const total = summary.rows[0].total;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const sorting =
    filters.sort === 'delivery'
      ? 'o.delivery_date ASC,o.created_at DESC,o.id DESC'
      : 'o.created_at DESC,o.id DESC';
  const rows = await db.query(
    `WITH paged AS (${scoped} ORDER BY ${sorting} LIMIT $${values.length + 1} OFFSET $${values.length + 2})
    SELECT o.*,COALESCE((SELECT json_agg(json_build_object('id',i.id,'product_id',i.product_id,'product_name',i.product_name,
      'quantity',i.quantity,'price',i.price,'subtotal',i.subtotal,'photo',p.photo,'product_type_id',p.product_type_id,
      'categories',COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]')) ORDER BY i.id)
      FROM order_items i LEFT JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id),'[]') AS items
      FROM paged o
      ORDER BY ${sorting}`,
    [...values, pageSize, (page - 1) * pageSize],
  );
  res.json({
    orders: rows.rows,
    summary: summary.rows[0],
    trend: trend.rows,
    page,
    pages,
    pageSize,
    total,
    period: filters.period,
  });
}
