import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const suggestionSchema = z.object({
  scheme: z.object({ primary: hex, secondary: hex, accent: hex, text: hex }),
  photoOrder: z.array(z.int().min(0)),
  headlineSize: z.enum(['lg', 'xl', '2xl']),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : undefined;

export interface SuggestInput {
  occasionType: string;
  defaultScheme: Suggestion['scheme'];
  headline: string;
  photoCount: number;
}

// Throws on any failure (no key, timeout, bad JSON); the caller falls back to the template's default scheme.
export async function suggest(input: SuggestInput): Promise<{ suggestion: Suggestion; prompt: string; tokens?: number }> {
  // Only the headline length is sent, never user text: the AI must not touch it (README), and it keeps PII out.
  const prompt = `You design Bangladeshi political posters. Occasion: ${input.occasionType}.
Template default colors: ${JSON.stringify(input.defaultScheme)}.
Pick a color scheme fitting the occasion with strong contrast between "text" and "primary".
Headline is ${[...input.headline].length} characters long: pick headlineSize (2xl short, xl medium, lg long).
photoOrder: a permutation of 0..${input.photoCount - 1}.`;
  if (!ai) throw new Error('GEMINI_API_KEY not set');

  const res = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(suggestionSchema),
      abortSignal: AbortSignal.timeout(15_000),
    },
  });
  const suggestion = suggestionSchema.parse(JSON.parse(res.text ?? ''));
  const order = [...suggestion.photoOrder].sort((a, b) => a - b);
  if (order.length !== input.photoCount || order.some((n, i) => n !== i)) throw new Error('photoOrder is not a permutation');
  return { suggestion, prompt, tokens: res.usageMetadata?.totalTokenCount };
}
