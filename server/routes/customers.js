import { Router } from 'express';
import { db } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
export const customers = Router();
customers.use(authenticate, authorize('admin', 'owner'));
customers.get('/', async (req, res) => {
  const rows = (
    await db.query(
      `SELECT phone_number AS phone,(array_agg(customer_name ORDER BY created_at DESC,id DESC))[1] AS name,count(*)::int AS orders,COALESCE(sum(total) FILTER(WHERE status='completed'),0) AS total,max(order_date) AS last FROM orders GROUP BY phone_number ORDER BY max(created_at) DESC LIMIT 500`,
    )
  ).rows;
  const summary = (
    await db.query(
      `SELECT (SELECT count(DISTINCT phone_number)::int FROM orders) AS customers,(SELECT count(*)::int FROM (SELECT phone_number FROM orders GROUP BY phone_number HAVING count(*)>1) r) AS repeat_customers,(SELECT COALESCE(sum(total),0) FROM orders WHERE status='completed') AS revenue,(SELECT count(*)::int FROM orders WHERE status IN ('pending','processing')) AS active_orders`,
    )
  ).rows[0];
  res.json({ rows, summary });
});
