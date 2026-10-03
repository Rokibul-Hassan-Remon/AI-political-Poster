import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const MAX_REGENERATES = 3;

const posterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
    formData: {
      name: { type: String, required: true },
      designation: { type: String, required: true },
      organization: { type: String, required: true },
      area: String,
      headline: String, // empty → template's headlineDefault at render time
    },
    uploadedPhotoUrls: { type: [String], required: true },
    backgroundUrl: String, // user's own design, only for templates with layoutConfig.customBackground
    // One per photo, same order: focal point (x, y in %) + zoom, set by the user on the form.
    photoAdjust: { type: [{ _id: false, x: Number, y: Number, zoom: Number }], default: undefined },
    // Canvas editor: per [data-layer] move/scale/rotate, applied at render (render.service).
    layout: { type: [{ _id: false, key: String, dx: Number, dy: Number, scale: Number, rotate: Number }], default: undefined },
    // User-picked text colors per section (#rrggbb); a missing key keeps the template/AI color.
    textColors: { type: { _id: false, headline: String, name: String, meta: String }, default: undefined },
    // Cut-outs from the last render that the editor drags around: background JPEG + one PNG per layer.
    layers: {
      background: String,
      items: { type: [{ _id: false, key: String, url: String, x: Number, y: Number, w: Number, h: Number }], default: undefined },
    },
    aiSuggestion: Schema.Types.Mixed, // Gemini JSON used for the last render
    generatedImageUrl: String,
    generatedPdfUrl: String,
    status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating', required: true },
    error: String,
    regenerateCount: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

export type PosterDoc = HydratedDocument<InferSchemaType<typeof posterSchema>>;

export const Poster = model('Poster', posterSchema);
