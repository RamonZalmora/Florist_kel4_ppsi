import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
import { photo } from '../validation.js';
export const storeSettings = Router();
export const storeSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().max(500),
    latitude: z.number().finite().min(-90).max(90).nullable().optional(),
    longitude: z.number().finite().min(-180).max(180).nullable().optional(),
    map_url: z
      .string()
      .trim()
      .max(1000)
      .refine((value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return (
            url.protocol === 'https:' &&
            !url.username &&
            !url.password &&
            !url.port &&
            ((url.hostname === 'maps.app.goo.gl' && /^\/[A-Za-z0-9]+$/.test(url.pathname)) ||
              (['www.google.com', 'google.com', 'maps.google.com'].includes(url.hostname) &&
                url.pathname.startsWith('/maps')))
          );
        } catch {
          return false;
        }
      }, 'Gunakan tautan Google Maps yang valid.')
      .optional(),
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
      .refine((v) => {
        if (v === '') return true;
        try {
          const u = new URL(v);
          return (
            u.protocol === 'https:' &&
            !u.username &&
            !u.password &&
            !u.port &&
            ((['instagram.com', 'www.instagram.com'].includes(u.hostname) &&
              /^\/[a-zA-Z0-9_.]+\/?$/.test(u.pathname)) ||
              (u.hostname === 'share.google' &&
                /^\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname) &&
                !u.search))
          );
        } catch {
          return false;
        }
      }, 'Gunakan URL Instagram atau tautan share.google yang valid.'),
    tiktok: z
      .string()
      .trim()
      .max(300)
      .refine((v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return (
            u.protocol === 'https:' &&
            ['tiktok.com', 'www.tiktok.com'].includes(u.hostname) &&
            !u.username &&
            !u.password &&
            !u.port &&
            /^\/@[a-zA-Z0-9_.]+\/?$/.test(u.pathname)
          );
        } catch {
          return false;
        }
      }, 'Gunakan URL profil TikTok yang valid.')
      .default(''),
    shopee: z
      .string()
      .trim()
      .max(300)
      .refine(
        (v) => v === '' || /^https:\/\/(www\.)?shopee\.co\.id\/[a-zA-Z0-9_.-]+\/?$/.test(v),
        'Gunakan URL toko Shopee yang valid.',
      )
      .default(''),
    tokopedia: z
      .string()
      .trim()
      .max(300)
      .refine((v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return (
            u.protocol === 'https:' &&
            ['tokopedia.com', 'www.tokopedia.com'].includes(u.hostname) &&
            /^\/[a-zA-Z0-9_.-]+\/?$/.test(u.pathname) &&
            !u.username &&
            !u.password &&
            !u.port
          );
        } catch {
          return false;
        }
      }, 'Gunakan URL toko Tokopedia yang valid.')
      .default(''),
    description: z.string().trim().max(1500),
    about_story: z.string().trim().max(2000).default(''),
    about_service: z.string().trim().max(2000).default(''),
    care_tips: z.string().trim().max(2000).default(''),
    logo: photo,
  })
  .refine(
    (v) =>
      (v.latitude === undefined && v.longitude === undefined) ||
      (v.latitude !== undefined &&
        v.longitude !== undefined &&
        (v.latitude === null) === (v.longitude === null)),
    {
      message: 'Isi latitude dan longitude sekaligus, atau kosongkan keduanya.',
      path: ['latitude'],
    },
  );
storeSettings.put('/', authenticate, authorize('owner'), async (req, res) => {
  const v = storeSchema.parse(req.body);
  const { rows } = await db.query(
    "INSERT INTO store_settings(id,name,address,whatsapp,instagram,description,logo,tiktok,about_story,about_service,care_tips,shopee,tokopedia,map_url,latitude,longitude) VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'https://maps.app.goo.gl/cZhMm6Z3326uHWz77'),$14,$15) ON CONFLICT(id) DO UPDATE SET name=excluded.name,address=excluded.address,map_url=COALESCE($13,store_settings.map_url),latitude=CASE WHEN $16 THEN excluded.latitude ELSE store_settings.latitude END,longitude=CASE WHEN $16 THEN excluded.longitude ELSE store_settings.longitude END,whatsapp=excluded.whatsapp,instagram=excluded.instagram,tiktok=excluded.tiktok,shopee=excluded.shopee,tokopedia=excluded.tokopedia,about_story=excluded.about_story,about_service=excluded.about_service,care_tips=excluded.care_tips,description=excluded.description,logo=excluded.logo,updated_at=now() RETURNING name,address,map_url,latitude,longitude,whatsapp,instagram,tiktok,shopee,tokopedia,description,logo,about_story,about_service,care_tips",
    [
      v.name,
      v.address,
      v.whatsapp,
      v.instagram,
      v.description,
      v.logo,
      v.tiktok,
      v.about_story,
      v.about_service,
      v.care_tips,
      v.shopee,
      v.tokopedia,
      v.map_url ?? null,
      v.latitude ?? null,
      v.longitude ?? null,
      v.latitude !== undefined,
    ],
  );
  res.json(rows[0]);
});
