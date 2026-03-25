import dotenv from 'dotenv';
import path from 'path';

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, 'apps', 'web');
const webDistPath = path.join(webRoot, 'dist');

dotenv.config({ path: path.join(repoRoot, '.env') });

import { loadEnv } from './config/env';

const env = loadEnv();

import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import { createAuthRouter } from './routes/auth';
import { createCalendarRouter } from './routes/calendar';
import { createV1Router } from './routes/v1';
import { initPool, closePool } from './db/connection';
import { runMigrations } from './db/migrate';
import { PostgresAppStore } from './db/repository';

const PgSession = connectPgSimple(session);

async function startServer() {
  // 1. Initialize database
  const pool = await initPool(env.DATABASE_URL);

  // 2. Run migrations
  await runMigrations(pool);

  // 3. Create repository
  const appStore = new PostgresAppStore(pool);

  // 4. Build Express app
  const app = express();
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
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.APP_URL}/api/auth/google/callback`,
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/v1', createV1Router(appStore, pool));
  app.use('/api/auth', createAuthRouter(oauth2Client, env.APP_URL, pool));
  app.use('/api/calendar', createCalendarRouter(oauth2Client));

  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: webRoot,
      configFile: path.join(webRoot, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(webDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${env.PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
