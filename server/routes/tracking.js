import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db/pool.js';
export const tracking = Router();
tracking.post(
  '/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
  }),
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const code = z
      .string()
      .trim()
      .regex(/^[a-f0-9]{32}$/, 'Kode pelacakan harus 32 karakter sesuai yang diberikan toko.')
      .parse(req.body.code);
    const row = (
      await db.query(
        'SELECT id,status,order_date,delivery_date FROM orders WHERE tracking_code=$1',
        [code],
      )
    ).rows[0];
    if (!row)
      return res
        .status(404)
        .json({ error: 'Kode pelacakan tidak ditemukan. Periksa kembali kode dari toko.' });
    res.json({
      order_code: 'BV-' + String(row.id).padStart(4, '0'),
      status: row.status,
      order_date: row.order_date,
      delivery_date: row.delivery_date,
    });
  },
);
