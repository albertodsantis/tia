import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type pg from 'pg';
import { logger } from '../lib/logger';

export async function runMigrations(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Resolve migrations directory relative to this file
    let migrationsDir: string;
    try {
      // ESM mode (tsx dev)
      const currentFile = fileURLToPath(import.meta.url);
      migrationsDir = path.join(path.dirname(currentFile), 'migrations');
    } catch {
      // CJS mode (esbuild production bundle)
      migrationsDir = path.join(__dirname, 'migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      logger.warn('No migrations directory found, skipping');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1',
        [file],
      );

      if (rows.length > 0) {
        continue;
      }

      logger.info({ file }, 'Applying migration');
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        logger.info({ file }, 'Migration applied');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err}`);
      }
    }
  } finally {
    client.release();
  }
}
