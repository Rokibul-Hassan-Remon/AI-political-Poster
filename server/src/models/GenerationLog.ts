import { Schema, model } from 'mongoose';

const generationLogSchema = new Schema(
  {
    posterId: { type: Schema.Types.ObjectId, ref: 'Poster', required: true, index: true },
    promptUsed: String, // empty when Gemini was skipped (no API key)
    tokensUsed: Number,
    latencyMs: { type: Number, required: true },
    success: { type: Boolean, required: true },
    error: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const GenerationLog = model('GenerationLog', generationLogSchema);
