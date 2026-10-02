import type { ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Single place that turns thrown errors into `{ error: { message } }`.
// Express 5 forwards rejected async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: { message: z.prettifyError(err) } });
  } else {
    console.error(err);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};
