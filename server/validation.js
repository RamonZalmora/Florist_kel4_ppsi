import { z } from 'zod';
export const idSchema = z.coerce.number().int().positive().safe();
const text = (max) => z.string().trim().min(1, 'Wajib diisi').max(max);
export const photo = z
  .string()
  .max(1500)
  .refine(
    (v) => /^\/assets\/[a-zA-Z0-9_.\/-]+$/.test(v) || /^https:\/\//.test(v),
    'Gunakan URL HTTPS atau aset lokal /assets/',
  );
export const productSchema = z.object({
  name: text(120),
  price: z.coerce.number().positive().max(1000000000).multipleOf(0.01),
  flower_type: text(150),
  size: text(80),
  description: text(5000),
  photo: photo.default('/assets/floral-hero.svg'),
  active: z.boolean().default(true),
});
export const categorySchema = z.object({
  name: text(100),
  description: z.string().trim().max(1000).default(''),
  photo: photo.default('/assets/floral-hero.svg'),
});
export const recommendationSchema = z.object({
  category_id: idSchema,
  product_id: idSchema,
  note: z.string().trim().max(300).default(''),
});
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Gunakan tanggal YYYY-MM-DD')
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Tanggal tidak valid',
  );
export const orderSchema = z
  .object({
    customer_name: text(120),
    phone_number: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{7,22}$/, 'Nomor telepon tidak valid'),
    order_date: dateSchema,
    delivery_date: dateSchema,
    request: z.string().trim().max(3000).default(''),
    items: z
      .array(z.object({ product_id: idSchema, quantity: z.coerce.number().int().min(1).max(100) }))
      .min(1)
      .max(30),
  })
  .refine((v) => v.delivery_date >= v.order_date, {
    message: 'Tanggal pengiriman tidak boleh sebelum tanggal pesanan',
    path: ['delivery_date'],
  })
  .refine((v) => new Set(v.items.map((i) => i.product_id)).size === v.items.length, {
    message: 'Produk yang sama tidak boleh berulang',
    path: ['items'],
  });
export const statusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
});
export function period(query) {
  const end = new Date().toISOString().slice(0, 10),
    start = end.slice(0, 7) + '-01';
  return z
    .object({ from: dateSchema, to: dateSchema })
    .refine((v) => v.from <= v.to, { message: 'Tanggal mulai harus sebelum tanggal akhir' })
    .parse({ from: query.from || start, to: query.to || end });
}
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
