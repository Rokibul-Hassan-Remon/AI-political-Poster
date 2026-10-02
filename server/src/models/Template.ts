import { Schema, model, type InferSchemaType } from 'mongoose';

export const OCCASIONS = ['victory-day', 'mourning', 'campaign', 'greetings', 'festival'] as const;

const color = { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ };

const templateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    // Maps to server/src/templates/<slug>.html.
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    occasionType: { type: String, enum: OCCASIONS, required: true },
    thumbnailUrl: { type: String, default: '' },
    layoutConfig: {
      photoSlots: { type: Number, required: true, min: 1, max: 3 },
      defaultScheme: { primary: color, secondary: color, accent: color, text: color },
      headlineDefault: { type: String, required: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type TemplateData = InferSchemaType<typeof templateSchema>;

export const Template = model('Template', templateSchema);
