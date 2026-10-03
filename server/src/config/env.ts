import 'dotenv/config';
import { z } from 'zod';

// Add keys here as modules need them; keep .env.example in sync.
const schema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().startsWith('mongodb'),
  CLIENT_URL: z.url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CLOUDINARY_URL: z.string().startsWith('cloudinary://'),
  // Optional: without a key, posters render with the template's default colors.
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  // Optional: only the seed script reads these.
  ADMIN_EMAIL: z.email().trim().toLowerCase().optional(),
  ADMIN_PASSWORD: z.string().min(8).max(72).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
