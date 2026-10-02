import 'dotenv/config';
import { z } from 'zod';

// Add keys here as modules need them; keep .env.example in sync.
const schema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().startsWith('mongodb'),
  CLIENT_URL: z.url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
