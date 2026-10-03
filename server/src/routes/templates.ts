import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { HttpError } from '../middleware/error';
import { OCCASIONS, Template } from '../models/Template';

const listQuery = z.object({ occasion: z.enum(OCCASIONS).optional() });

export const templatesRouter = Router();

templatesRouter.get('/', async (req, res) => {
  const { occasion } = listQuery.parse(req.query);
  res.json(await Template.find({ isActive: true, ...(occasion && { occasionType: occasion }) }).sort({ createdAt: 1 }));
});

templatesRouter.get('/:id', async (req, res) => {
  // Invalid ids and inactive templates both look "not found" to users.
  const template = isValidObjectId(req.params.id) ? await Template.findOne({ _id: req.params.id, isActive: true }) : null;
  if (!template) throw new HttpError(404, 'Template not found');
  res.json(template);
});
