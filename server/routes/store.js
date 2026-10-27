import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
import { photo } from '../validation.js';
export const storeSettings = Router();
export const storeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500),
  whatsapp: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^\d{8,20}$/.test(v),
      'Gunakan nomor dengan kode negara, hanya angka.',
    ),
  instagram: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === '' || /^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(v),
      'Gunakan URL profil Instagram yang valid.',
    ),
  tiktok: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === '' || /^https:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/.test(v),
      'Gunakan URL profil TikTok yang valid.',
    )
    .default(''),
  description: z.string().trim().max(1500),
  logo: photo,
});
storeSettings.put('/', authenticate, authorize('admin'), async (req, res) => {
  const v = storeSchema.parse(req.body);
  const { rows } = await db.query(
    'INSERT INTO store_settings(id,name,address,whatsapp,instagram,description,logo,tiktok) VALUES(1,$1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,address=excluded.address,whatsapp=excluded.whatsapp,instagram=excluded.instagram,tiktok=excluded.tiktok,description=excluded.description,logo=excluded.logo,updated_at=now() RETURNING name,address,whatsapp,instagram,tiktok,description,logo',
    [v.name, v.address, v.whatsapp, v.instagram, v.description, v.logo, v.tiktok],
  );
  res.json(rows[0]);
});
