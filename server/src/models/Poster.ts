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
    // One per photo, same order: focal point (x, y in %) + zoom, set by the user on the form.
    photoAdjust: { type: [{ _id: false, x: Number, y: Number, zoom: Number }], default: undefined },
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
