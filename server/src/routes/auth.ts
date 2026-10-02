import { Router, type CookieOptions, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { User, publicUser, type UserDoc } from '../models/User';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// path scopes the cookie to auth routes only; the client reaches us same-origin via the Next.js rewrite.
const cookieOptions: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth' };

const loginBody = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72), // bcrypt ignores bytes after 72
});
const registerBody = loginBody.extend({ name: z.string().trim().min(1).max(100) });

// Access token (15 min) in the body; refresh token (7 days) in an httpOnly cookie.
function startSession(res: Response, user: UserDoc) {
  const payload = { sub: user.id as string, role: user.role };
  res.cookie(REFRESH_COOKIE, jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' }), {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE_MS,
  });
  res.json({ accessToken: jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' }), user: publicUser(user) });
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = registerBody.parse(req.body);
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201);
  startSession(res, user);
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginBody.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password: don't reveal which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  startSession(res, user);
});

// Reads the httpOnly cookie and issues a fresh access token.
// ponytail: refresh token isn't rotated or revocable; add User.tokenVersion if logout-everywhere is needed.
authRouter.post('/refresh', async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== 'string') throw new HttpError(401, 'Not logged in');
  let userId: string;
  try {
    userId = (jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload).sub as string;
  } catch {
    throw new HttpError(401, 'Session expired');
  }
  const user = await User.findById(userId); // also picks up role changes / deleted users
  if (!user) throw new HttpError(401, 'Session expired');
  res.json({ accessToken: jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '15m' }), user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions).status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new HttpError(401, 'Session expired');
  res.json(publicUser(user));
});
