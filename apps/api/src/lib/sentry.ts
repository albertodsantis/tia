import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // We rely on setupExpressErrorHandler + manual captureException for error
    // tracking, so the auto-instrumentation layer (which requires --import in
    // ESM runtimes like tsx) is unnecessary. Disabling it silences the
    // "express is not instrumented" warning without losing error capture.
    defaultIntegrations: false,
    ignoreErrors: [
      /ECONNRESET/,
      /EPIPE/,
      /socket hang up/i,
    ],
  });

  initialized = true;
}

export { Sentry };
