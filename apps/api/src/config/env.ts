export interface AppEnv {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  APP_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  PORT: number;
  NODE_ENV: 'development' | 'production';
  EARLY_ACCESS: boolean;
  GEMINI_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  RESEND_API_KEY?: string;
  SENTRY_DSN?: string;
  ADMIN_API_KEY?: string;
  AI_UNLIMITED_EMAILS: string[];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      'Check your .env file or environment configuration.',
    );
  }
  return value;
}

function warnIfMissing(name: string): string {
  const value = process.env[name] || '';
  if (!value) {
    // Logger not yet imported at config load time — keep console.warn here to avoid circular init
    console.warn(`Warning: ${name} is not set. Google Calendar integration will not work.`);
  }
  return value;
}

export function loadEnv(): AppEnv {
  return {
    DATABASE_URL: requireEnv('DATABASE_URL'),
    SESSION_SECRET: requireEnv('SESSION_SECRET'),
    APP_URL: requireEnv('APP_URL'),
    GOOGLE_CLIENT_ID: warnIfMissing('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: warnIfMissing('GOOGLE_CLIENT_SECRET'),
    PORT: Number(process.env.PORT || 3000),
    NODE_ENV: (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
    EARLY_ACCESS: process.env.EARLY_ACCESS !== 'false',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    SUPABASE_URL: process.env.SUPABASE_URL || undefined,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    SENTRY_DSN: process.env.SENTRY_DSN || undefined,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY || undefined,
    AI_UNLIMITED_EMAILS: (process.env.AI_UNLIMITED_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  };
}
