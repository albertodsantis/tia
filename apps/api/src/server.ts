import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { initSentry } from './lib/sentry';
initSentry();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './app';
import { renderPrivacyPage, renderTermsPage } from './lib/legalRenderer';
import { logger } from './lib/logger';

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, 'apps', 'web');
const webDistPath = path.join(webRoot, 'dist');

async function startServer() {
  const { app, env, closePool } = await createApp();

  // Server-rendered legal pages (crawlable by Google for OAuth verification)
  app.get('/privacidad', (_req, res) => {
    res.type('html').send(renderPrivacyPage());
  });
  app.get('/terminos', (_req, res) => {
    res.type('html').send(renderTermsPage());
  });

  // Frontend serving
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
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
