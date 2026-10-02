import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { env } from './config/env';
import { HttpError, errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { templatesRouter } from './routes/templates';
import { uploadRouter } from './routes/upload';

const app = express();
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api/auth', authRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/upload', uploadRouter);

app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
app.use(errorHandler);

async function start() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(env.PORT, () => console.log(`Server on http://localhost:${env.PORT}`));
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
