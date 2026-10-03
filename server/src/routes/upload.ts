import { Router } from 'express';
import multer from 'multer';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { uploadBuffer } from '../services/storage.service';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const photos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG or WEBP photos are allowed')),
}).array('photos', 3);

export const uploadRouter = Router();

// Returns URLs in the same order as sent: photo 1 = main/center.
uploadRouter.post('/', requireAuth, photos, async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) throw new HttpError(400, 'Send 1–3 photos in the "photos" field');
  const folder = `rise-together/photos/${req.user!.id}`;
  res.status(201).json({ urls: await Promise.all(files.map((f) => uploadBuffer(f.buffer, folder))) });
});
