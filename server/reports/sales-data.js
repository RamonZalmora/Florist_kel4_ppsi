import { z } from 'zod';
import { db } from '../db/pool.js';
import { dateSchema, idSchema } from '../validation.js';

const schema = z.object({
  period: z.enum(['all', '7', 'month', 'custom']).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  q: z.string().trim().max(120).default(''),
  category: z.union([z.literal('none'), idSchema]).optional(),
  type: z.union([z.literal('none'), idSchema]).optional(),
  sort: z.enum(['recent', 'highest', 'lowest']).default('recent'),
  page: z.coerce.number().int().positive().max(100000).default(1),
});
const dateOnly = (value) =>
  typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);

export async function salesReport(query, { paginate = true, defaultPeriod = 'all' } = {}) {
  const filters = schema.parse(query);
  filters.period ||= filters.from || filters.to ? 'custom' : defaultPeriod;
  const bounds = (
    await db.query(`SELECT to_char((now() AT TIME ZONE 'Asia/Jakarta')::date,'YYYY-MM-DD') AS today,
    to_char(COALESCE(min(s.sale_date),(now() AT TIME ZONE 'Asia/Jakarta')::date),'YYYY-MM-DD') AS earliest,
    to_char(greatest(COALESCE(max(s.sale_date),(now() AT TIME ZONE 'Asia/Jakarta')::date),(now() AT TIME ZONE 'Asia/Jakarta')::date),'YYYY-MM-DD') AS latest
    FROM sales s JOIN orders o ON o.id=s.order_id AND o.status='completed'`)
  ).rows[0];
  let from, to;
  if (filters.period === 'all') {
    from = bounds.earliest;
    to = bounds.latest;
  } else if (filters.period === '7') {
    const start = new Date(bounds.today + 'T12:00:00Z');
    start.setUTCDate(start.getUTCDate() - 6);
    from = start.toISOString().slice(0, 10);
    to = bounds.today;
  } else if (filters.period === 'month') {
    from = bounds.today.slice(0, 7) + '-01';
    to = bounds.today;
  } else {
    from = filters.from || bounds.today.slice(0, 7) + '-01';
    to = filters.to || bounds.today;
  }
  z.object({ from: dateSchema, to: dateSchema })
    .refine((value) => value.from <= value.to, {
      message: 'Tanggal mulai harus sebelum tanggal akhir',
    })
    .parse({ from, to });
  const params = [from, to];
  const bind = (value) => {
    params.push(value);
    return '$' + params.length;
  };
  const where = ["o.status='completed'", 's.sale_date BETWEEN $1::date AND $2::date'];
  if (filters.q) {
    const term = bind('%' + filters.q + '%');
    where.push(
      `(o.customer_name ILIKE ${term} OR o.phone_number ILIKE ${term} OR ('BV-'||lpad(o.id::text,greatest(4,length(o.id::text)),'0')) ILIKE ${term} OR EXISTS(SELECT 1 FROM order_items search_item WHERE search_item.order_id=o.id AND search_item.product_name ILIKE ${term}))`,
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
  const scoped = `SELECT s.id,s.order_id,s.sale_date,s.total_sale,o.customer_name,o.phone_number FROM sales s JOIN orders o ON o.id=s.order_id WHERE ${where.join(' AND ')}`;
  const days = Math.floor((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const interval = days > 62 ? 'month' : 'day';
  const [summary, trend, highest, names] = await Promise.all([
    db.query(
      `WITH filtered AS (${scoped}) SELECT count(*)::int AS count,COALESCE(sum(total_sale),0) AS total,
      COALESCE(avg(total_sale),0) AS average,count(DISTINCT phone_number)::int AS customers FROM filtered`,
      params,
    ),
    interval === 'month'
      ? db.query(
          `WITH filtered AS (${scoped}) SELECT to_char(date_trunc('month',sale_date),'YYYY-MM-DD') AS day,sum(total_sale) AS total,count(*)::int AS count FROM filtered GROUP BY date_trunc('month',sale_date) ORDER BY date_trunc('month',sale_date)`,
          params,
        )
      : db.query(
          `WITH filtered AS (${scoped}),days AS (SELECT generate_series($1::date,$2::date,'1 day'::interval)::date AS day)
          SELECT to_char(d.day,'YYYY-MM-DD') AS day,COALESCE(sum(f.total_sale),0) AS total,count(f.id)::int AS count FROM days d LEFT JOIN filtered f ON f.sale_date=d.day GROUP BY d.day ORDER BY d.day`,
          params,
        ),
    db.query(
      `WITH filtered AS (${scoped}) SELECT * FROM filtered ORDER BY total_sale DESC,id DESC LIMIT 1`,
      params,
    ),
    db.query(
      'SELECT (SELECT name FROM categories WHERE id=$1::bigint) AS category,(SELECT name FROM product_types WHERE id=$2::bigint) AS type',
      [
        typeof filters.category === 'number' ? filters.category : null,
        typeof filters.type === 'number' ? filters.type : null,
      ],
    ),
  ]);
  const count = summary.rows[0].count;
  const pages = Math.max(1, Math.ceil(count / 7));
  const page = Math.min(filters.page, pages);
  const sorting =
    filters.sort === 'highest'
      ? 'f.total_sale DESC,f.sale_date DESC,f.id DESC'
      : filters.sort === 'lowest'
        ? 'f.total_sale ASC,f.sale_date DESC,f.id DESC'
        : 'f.sale_date DESC,f.id DESC';
  const pagination = paginate ? ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : '';
  const rows = (
    await db.query(
      `WITH filtered AS (${scoped}), paged AS (SELECT f.* FROM filtered f ORDER BY ${sorting}${pagination})
    SELECT f.*,COALESCE((SELECT json_agg(json_build_object('id',i.id,'product_id',i.product_id,'product_name',i.product_name,'quantity',i.quantity,'price',i.price,'subtotal',i.subtotal,'photo',p.photo) ORDER BY i.id) FROM order_items i LEFT JOIN products p ON p.id=i.product_id WHERE i.order_id=f.order_id),'[]') AS items
    FROM paged f ORDER BY ${sorting}`,
      paginate ? [...params, 7, (page - 1) * 7] : params,
    )
  ).rows;
  const filterLabel = [
    filters.q ? 'Pencarian: ' + filters.q : '',
    filters.category === 'none'
      ? 'Tanpa occasion'
      : names.rows[0].category
        ? 'Occasion: ' + names.rows[0].category
        : '',
    filters.type === 'none'
      ? 'Jenis belum ditentukan'
      : names.rows[0].type
        ? 'Jenis: ' + names.rows[0].type
        : '',
  ]
    .filter(Boolean)
    .join(' / ');
  return {
    from,
    to,
    period: filters.period,
    interval,
    rows: rows.map((row) => ({ ...row, sale_date: dateOnly(row.sale_date) })),
    trend: trend.rows,
    count,
    total: Number(summary.rows[0].total),
    average: Number(summary.rows[0].average),
    customers: summary.rows[0].customers,
    highest: highest.rows[0]
      ? { ...highest.rows[0], sale_date: dateOnly(highest.rows[0].sale_date) }
      : null,
    page,
    pages,
    pageSize: 7,
    filterLabel,
    query: {
      period: filters.period,
      from,
      to,
      q: filters.q,
      sort: filters.sort,
      ...(filters.category !== undefined ? { category: filters.category } : {}),
      ...(filters.type !== undefined ? { type: filters.type } : {}),
    },
  };
}
