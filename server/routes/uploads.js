import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { authenticate, authorize } from '../auth.js';
import { fail } from '../validation.js';
export const uploadsDirectory = fileURLToPath(new URL('../../.local/uploads/', import.meta.url));
export const uploads = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
}).single('photo');
uploads.post(
  '/',
  authenticate,
  authorize('admin', 'owner'),
  (req, res, next) =>
    upload(req, res, (error) => {
      if (error)
        return res
          .status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 422)
          .json({ error: 'Upload ditolak. Gunakan satu foto JPEG/PNG/WebP, maksimal 5 MB.' });
      next();
    }),
  async (req, res) => {
    if (!req.file) fail(422, 'Pilih foto terlebih dahulu.');
    let image;
    try {
      const input = sharp(req.file.buffer, { limitInputPixels: 25000000, animated: false });
      const meta = await input.metadata();
      if (!['jpeg', 'png', 'webp'].includes(meta.format) || meta.pages > 1)
        fail(422, 'Format foto tidak didukung.');
      image = await input
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      fail(422, 'Berkas bukan foto JPEG, PNG, atau WebP yang valid.');
    }
    await mkdir(uploadsDirectory, { recursive: true });
    const name = randomUUID() + '.webp';
    await writeFile(join(uploadsDirectory, name), image, { flag: 'wx', mode: 0o600 });
    res.status(201).json({ url: '/uploads/' + name });
  },
);
