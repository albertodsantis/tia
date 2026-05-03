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
import { posthog } from './lib/posthog';
import { createAuthRouter } from './routes/auth';
import { createCalendarRouter } from './routes/calendar';
import { createV1Router } from './routes/v1';
import { createMediaKitRouter } from './routes/mediakit';
import { createAdminRouter } from './routes/admin';
import { createReferralsRouter } from './routes/referrals';
import { createAiRouter } from './routes/ai';
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
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      // Force HTTPS for a year in prod; include subdomains and allow preload list.
      strictTransportSecurity: env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Don't leak full URL on cross-origin navigations.
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

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

  app.use(express.json({ limit: '1mb' }));

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

  // Rate limiting for auth endpoints (stricter — protects against brute force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // General API rate limiter — prevents abuse and runaway clients.
  // Generous enough for normal usage (dashboard polls, rapid edits).
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { error: 'Demasiadas solicitudes. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/health/deep',
  });

  const googleCreds = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${env.APP_URL}/api/auth/google/callback`,
  };

  // Rate limit API routes (health checks are exempted via the skip fn above)
  app.use('/api', apiLimiter);

  app.get('/api/health', async (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/health/deep', async (_req, res) => {
    const start = Date.now();
    const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

    // Database
    const dbStart = Date.now();
    try {
      await pool.query('SELECT 1');
      checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks.database = {
        ok: false,
        latencyMs: Date.now() - dbStart,
        error: err instanceof Error ? err.message : 'unknown',
      };
    }

    // Session store (same pool, but verifies the session table exists)
    const sessStart = Date.now();
    try {
      await pool.query('SELECT 1 FROM session LIMIT 1');
      checks.sessionStore = { ok: true, latencyMs: Date.now() - sessStart };
    } catch (err) {
      checks.sessionStore = {
        ok: false,
        latencyMs: Date.now() - sessStart,
        error: err instanceof Error ? err.message : 'unknown',
      };
    }

    // Supabase storage
    const storageStart = Date.now();
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
      try {
        const response = await fetch(`${env.SUPABASE_URL}/storage/v1/bucket`, {
          method: 'GET',
          headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          },
          signal: AbortSignal.timeout(3000),
        });
        checks.storage = {
          ok: response.ok,
          latencyMs: Date.now() - storageStart,
          ...(response.ok ? {} : { error: `HTTP ${response.status}` }),
        };
      } catch (err) {
        checks.storage = {
          ok: false,
          latencyMs: Date.now() - storageStart,
          error: err instanceof Error ? err.message : 'unknown',
        };
      }
    } else {
      checks.storage = { ok: false, error: 'not configured' };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    res.status(allOk ? 200 : 503).json({
      ok: allOk,
      uptime: Math.round(process.uptime()),
      totalLatencyMs: Date.now() - start,
      checks,
    });
  });

  // Public profile route (no auth required) — mounted at root so /@handle is matched explicitly
  app.use(createMediaKitRouter(pool, env.NODE_ENV !== 'production'));

  const gamification = new GamificationService(appStore);
  app.use('/api/v1', createV1Router(appStore, pool, gamification));
  app.use('/api/v1/ai', createAiRouter(appStore, pool, env.GEMINI_API_KEY, env.AI_UNLIMITED_EMAILS));
  app.use('/api/auth', authLimiter, createAuthRouter(googleCreds, env.APP_URL, pool, env.EARLY_ACCESS));
  app.use('/api/calendar', createCalendarRouter(googleCreds, pool));
  app.use('/api/admin', createAdminRouter(pool, env.ADMIN_API_KEY));
  app.use('/api/referrals', createReferralsRouter(pool));

  // Manual Sentry error capture — avoids setupExpressErrorHandler, which
  // requires Sentry auto-instrumentation (only possible in ESM via --import).
  // This middleware captures the exception then forwards it to Express's
  // default error handler so the response is unchanged.
  if (env.SENTRY_DSN) {
    app.use((err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
      Sentry.captureException(err);
      next(err);
    });
  }

  app.use((err: Error, req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const userId: string | undefined = (req.session as any)?.user?.id;
    posthog.captureException(err, userId);
    next(err);
  });

  return { app, env, pool, closePool };
}
