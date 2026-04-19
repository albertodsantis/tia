import dotenv from 'dotenv';
import path from 'path';

const repoRoot = process.cwd();

dotenv.config({ path: path.join(repoRoot, '.env') });

import { loadEnv } from './config/env';
import type { AppEnv } from './config/env';

import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from './lib/logger';
import { createAuthRouter } from './routes/auth';
import { createCalendarRouter } from './routes/calendar';
import { createV1Router } from './routes/v1';
import { createMediaKitRouter } from './routes/mediakit';
import { initPool, closePool } from './db/connection';
import { runMigrations } from './db/migrate';
import { PostgresAppStore } from './db/repository';
import { GamificationService } from './services/gamification';
import type pg from 'pg';

const PgSession = connectPgSimple(session);

export async function createApp(): Promise<{
  app: express.Express;
  env: AppEnv;
  pool: pg.Pool;
  closePool: typeof closePool;
}> {
  const env = loadEnv();

  // 1. Initialize database
  const pool = await initPool(env.DATABASE_URL);

  // 2. Run migrations
  await runMigrations(pool);

  // 3. Create repository
  const appStore = new PostgresAppStore(pool);

  // 4. Build Express app
  const app = express();

  // Trust proxy (required behind Vercel, Render, Railway, Cloudflare, etc.)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' && existing ? existing : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    }),
  );

  app.use(express.json());

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: false,
      }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const googleCreds = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${env.APP_URL}/api/auth/google/callback`,
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public profile route (no auth required) — mounted at root so /@handle is matched explicitly
  app.use(createMediaKitRouter(pool, env.NODE_ENV !== 'production'));

  const gamification = new GamificationService(appStore);
  app.use('/api/v1', createV1Router(appStore, pool, gamification));
  app.use('/api/auth', authLimiter, createAuthRouter(googleCreds, env.APP_URL, pool, env.EARLY_ACCESS));
  app.use('/api/calendar', createCalendarRouter(googleCreds, pool));

  // Sentry error handler — must be registered before any other error middleware
  // and only captures errors from the routes mounted above.
  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  return { app, env, pool, closePool };
}
