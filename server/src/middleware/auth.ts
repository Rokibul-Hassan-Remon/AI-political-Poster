import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './error';

export type Role = 'user' | 'admin';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

// Verifies the short-lived access token from `Authorization: Bearer <jwt>`.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, 'Not logged in');
  try {
    const { sub, role } = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    req.user = { id: sub as string, role };
  } catch {
    throw new HttpError(401, 'Session expired');
  }
  next();
};

// Use after requireAuth.
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Admins only');
  next();
};
