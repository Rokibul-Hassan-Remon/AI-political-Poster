import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { MAX_REGENERATES, Poster } from '../models/Poster';
import { Template } from '../models/Template';
import { run } from '../services/generation.service';

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((s) => s || undefined);

const formData = z.object({
  name: text(100),
  designation: text(100),
  organization: text(150),
  area: optionalText(150),
  headline: optionalText(150),
});
const createBody = z.object({
  templateId: z.string().refine(isValidObjectId, 'Invalid template id'),
  formData,
  uploadedPhotoUrls: z.array(z.url()).min(1).max(3),
  backgroundUrl: z.url().optional(),
  photoAdjust: z
    .array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), zoom: z.number().min(1).max(3) }))
    .max(3)
    .optional(),
}).refine((b) => !b.photoAdjust || b.photoAdjust.length === b.uploadedPhotoUrls.length, 'photoAdjust needs one entry per photo');
const regenerateBody = z.object({ formData: formData.optional() });
// Keys match the templates' data-layer attributes; [] resets to the template layout.
const layoutBody = z.object({
  layout: z
    .array(
      z.object({
        key: z.enum(['headline', 'info', 'photo0', 'photo1', 'photo2']),
        dx: z.number().min(-1600).max(1600),
        dy: z.number().min(-1600).max(1600),
        scale: z.number().min(0.2).max(4),
        rotate: z.number().min(-180).max(180),
      }),
    )
    .max(5),
});

// Puppeteer will load these URLs: only accept the user's own uploads (no SSRF, no hotlinking).
function checkPhotoUrls(urls: string[], userId: string) {
  const prefix = 'https://res.cloudinary.com/';
  if (!urls.every((u) => u.startsWith(prefix) && u.includes(`/rise-together/photos/${userId}/`))) {
    throw new HttpError(400, 'Photos must be uploaded through /api/upload first');
  }
}

async function ownPoster(req: Request) {
  const poster = isValidObjectId(req.params.id) ? await Poster.findById(req.params.id) : null;
  if (!poster) throw new HttpError(404, 'Poster not found');
  if (!poster.userId.equals(req.user!.id)) throw new HttpError(403, 'Not your poster');
  return poster;
}

// ponytail: in-memory counter, resets on restart and isn't shared across instances; use a Mongo/Redis store if we scale out.
const generationLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user!.id,
  handler: (_req, _res, next) => next(new HttpError(429, 'Too many posters this hour, please try again later')),
});

export const postersRouter = Router();
postersRouter.use(requireAuth);

postersRouter.post('/', generationLimit, async (req, res) => {
  const body = createBody.parse(req.body);
  checkPhotoUrls([...body.uploadedPhotoUrls, ...(body.backgroundUrl ? [body.backgroundUrl] : [])], req.user!.id);
  const template = await Template.findOne({ _id: body.templateId, isActive: true });
  if (!template) throw new HttpError(404, 'Template not found');
  const custom = template.layoutConfig!.customBackground;
  if (custom && !body.backgroundUrl) throw new HttpError(400, 'This template needs your own background image');
  if (!custom) delete body.backgroundUrl;
  if (body.uploadedPhotoUrls.length > template.layoutConfig!.photoSlots) {
    throw new HttpError(400, `This template takes at most ${template.layoutConfig!.photoSlots} photo(s)`);
  }
  const poster = await Poster.create({ ...body, userId: req.user!.id });
  void run(poster.id);
  res.status(201).json(poster);
});

postersRouter.get('/me', async (req, res) => {
  res.json(await Poster.find({ userId: req.user!.id }).sort({ createdAt: -1 }));
});

postersRouter.get('/:id', async (req, res) => {
  res.json(await ownPoster(req));
});

// Also the "retry" after a failure: both count toward the limit.
postersRouter.post('/:id/regenerate', generationLimit, async (req, res) => {
  const { formData } = regenerateBody.parse(req.body ?? {});
  const poster = await ownPoster(req);
  if (poster.status === 'generating') throw new HttpError(409, 'Poster is still generating');
  if (poster.regenerateCount >= MAX_REGENERATES) throw new HttpError(409, `You can regenerate a poster at most ${MAX_REGENERATES} times`);
  if (formData) poster.formData = formData;
  poster.set({ status: 'generating', error: undefined, regenerateCount: poster.regenerateCount + 1 });
  await poster.save();
  void run(poster.id);
  res.json(poster);
});

// Canvas editor save: re-render with the same text and colors; doesn't use up a regenerate.
postersRouter.put('/:id/layout', generationLimit, async (req, res) => {
  const { layout } = layoutBody.parse(req.body);
  const poster = await ownPoster(req);
  if (poster.status === 'generating') throw new HttpError(409, 'Poster is still generating');
  poster.set({ layout, status: 'generating', error: undefined });
  await poster.save();
  void run(poster.id, { keepSuggestion: true });
  res.json(poster);
});

// ponytail: generated files stay in Cloudinary; delete them too if storage cost matters.
postersRouter.delete('/:id', async (req, res) => {
  await (await ownPoster(req)).deleteOne();
  res.status(204).end();
});
