import { storeInfo } from '../store.js';
import { Router } from 'express';
import { db } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
import { salesReport } from '../reports/sales-data.js';
import { salesPdf, salesExcel } from '../reports/export-sales.js';
export const reports = Router();
reports.use(authenticate, authorize('admin', 'owner'));
reports.get('/workspace', async (req, res) => {
  res.json(await salesReport(req.query));
});
reports.get('/', async (req, res) => {
  res.json(await salesReport(req.query, { paginate: false, defaultPeriod: 'custom' }));
});
reports.get('/pdf', async (req, res) => {
  const report = await salesReport(req.query, { paginate: false, defaultPeriod: 'custom' });
  const store = await storeInfo();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="bien-vendre-${report.from}-${report.to}.pdf"`,
  });
  salesPdf(report, store, res);
});
reports.get('/excel', async (req, res) => {
  const report = await salesReport(req.query, { paginate: false, defaultPeriod: 'custom' });
  const buffer = await salesExcel(report, await storeInfo());
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="bien-vendre-${report.from}-${report.to}.xlsx"`,
  });
  res.send(buffer);
});
export const dashboard = Router();
dashboard.use(authenticate);
dashboard.get('/', async (req, res) => {
  const [summary, trend, popular, occasionSales, completedOrderSales, productTypeSales] =
    await Promise.all([
      db.query(
        `SELECT (SELECT COALESCE(sum(total_sale),0) FROM sales WHERE date_trunc('month',sale_date)=date_trunc('month',(now() AT TIME ZONE 'Asia/Jakarta')::date)) AS revenue,(SELECT count(*)::int FROM orders) AS total_orders,(SELECT count(*)::int FROM orders WHERE status IN ('pending','processing')) AS pending_orders,(SELECT count(DISTINCT phone_number)::int FROM orders) AS customers,(SELECT count(*)::int FROM products WHERE active=true) AS products,(SELECT count(*)::int FROM orders WHERE status='completed') AS completed_orders,(SELECT count(*)::int FROM orders WHERE request LIKE 'DATA SIMULASI%') AS demo_orders`,
      ),
      db.query(
        `SELECT to_char(d.day,'YYYY-MM-DD') AS day,COALESCE(sum(s.total_sale),0) AS total FROM generate_series((now() AT TIME ZONE 'Asia/Jakarta')::date-29,(now() AT TIME ZONE 'Asia/Jakarta')::date,'1 day'::interval) d(day) LEFT JOIN sales s ON s.sale_date=d.day::date GROUP BY d.day ORDER BY d.day`,
      ),
      db.query(
        `SELECT p.id,p.name,p.photo,p.active,p.product_type_id,sum(oi.quantity)::int AS sold_count,count(DISTINCT o.id)::int AS completed_order_count,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]') AS categories FROM products p JOIN order_items oi ON oi.product_id=p.id JOIN orders o ON o.id=oi.order_id AND o.status='completed' JOIN sales s ON s.order_id=o.id GROUP BY p.id ORDER BY sold_count DESC,p.id DESC`,
      ),
      db.query(
        `SELECT c.id,c.name,
       COALESCE((SELECT count(DISTINCT o.id) FROM recommendations r
         JOIN order_items oi ON oi.product_id=r.product_id
         JOIN orders o ON o.id=oi.order_id AND o.status='completed'
         JOIN sales s ON s.order_id=o.id
         WHERE r.category_id=c.id),0) AS total_orders,
       COALESCE(json_agg(json_build_object('day',daily.day,'orders',daily.orders) ORDER BY daily.day) FILTER (WHERE daily.day IS NOT NULL),'[]') AS sales
       FROM categories c
       LEFT JOIN (
         SELECT r.category_id,to_char(s.sale_date,'YYYY-MM-DD') AS day,count(DISTINCT o.id)::int AS orders
         FROM recommendations r
         JOIN order_items oi ON oi.product_id=r.product_id
         JOIN orders o ON o.id=oi.order_id AND o.status='completed'
         JOIN sales s ON s.order_id=o.id
         WHERE s.sale_date BETWEEN (now() AT TIME ZONE 'Asia/Jakarta')::date-29 AND (now() AT TIME ZONE 'Asia/Jakarta')::date
         GROUP BY r.category_id,s.sale_date
       ) daily ON daily.category_id=c.id
       GROUP BY c.id ORDER BY c.id`,
      ),
      db.query(
        `SELECT count(o.id) AS all_time,
       count(o.id) FILTER (WHERE s.sale_date BETWEEN (now() AT TIME ZONE 'Asia/Jakarta')::date-29 AND (now() AT TIME ZONE 'Asia/Jakarta')::date) AS last_30_days
       FROM orders o JOIN sales s ON s.order_id=o.id WHERE o.status='completed'`,
      ),
      db.query(
        `WITH daily AS (
         SELECT p.product_type_id AS type_id,s.sale_date,count(DISTINCT o.id)::int AS orders
         FROM products p
         JOIN order_items oi ON oi.product_id=p.id
         JOIN orders o ON o.id=oi.order_id AND o.status='completed'
         JOIN sales s ON s.order_id=o.id
         GROUP BY p.product_type_id,s.sale_date
       ), types AS (
         SELECT id,name FROM product_types
         UNION ALL SELECT NULL::bigint,'Belum ditentukan' WHERE EXISTS(SELECT 1 FROM daily WHERE type_id IS NULL)
       )
       SELECT t.id,t.name,COALESCE(sum(d.orders),0) AS total_orders,
       COALESCE(json_agg(json_build_object('day',to_char(d.sale_date,'YYYY-MM-DD'),'orders',d.orders) ORDER BY d.sale_date)
         FILTER (WHERE d.sale_date BETWEEN (now() AT TIME ZONE 'Asia/Jakarta')::date-29 AND (now() AT TIME ZONE 'Asia/Jakarta')::date),'[]') AS sales
       FROM types t LEFT JOIN daily d ON d.type_id IS NOT DISTINCT FROM t.id
       GROUP BY t.id,t.name ORDER BY t.id NULLS LAST`,
      ),
    ]);
  res.json({
    summary: summary.rows[0],
    trend: trend.rows.slice(-7),
    trend30: trend.rows,
    popular: popular.rows,
    occasionSales: occasionSales.rows,
    completedOrderSales: completedOrderSales.rows[0],
    productTypeSales: productTypeSales.rows,
  });
});
