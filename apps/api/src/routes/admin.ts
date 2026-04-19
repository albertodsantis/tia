import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import { timingSafeEqual } from 'crypto';
import { logger } from '../lib/logger';

function requireAdminKey(expected: string) {
  const expectedBuf = Buffer.from(expected);
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.get('authorization') || '';
    const provided = header.startsWith('Bearer ')
      ? header.slice(7)
      : typeof req.query.key === 'string'
        ? req.query.key
        : '';
    const providedBuf = Buffer.from(provided);
    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      logger.warn({ ip: req.ip, path: req.path }, 'Admin auth failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };
}

export function createAdminRouter(pool: pg.Pool, adminKey: string | undefined) {
  const router = Router();

  if (!adminKey) {
    router.use((_req, res) => {
      res.status(503).json({ error: 'Admin API disabled — ADMIN_API_KEY not configured.' });
    });
    return router;
  }

  router.use(requireAdminKey(adminKey));

  router.get('/stats', async (_req, res) => {
    try {
      const [
        usersTotal,
        usersActive7d,
        usersActive30d,
        usersNew7d,
        tasksTotal,
        tasksNew7d,
        partnersTotal,
        partnersNew7d,
        sessionsActive,
        dbSize,
        tableSizes,
      ] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM users`),
        pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
           WHERE changed_at > NOW() - INTERVAL '7 days'`,
        ),
        pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
           WHERE changed_at > NOW() - INTERVAL '30 days'`,
        ),
        pool.query(
          `SELECT COUNT(*)::int AS n FROM users
           WHERE created_at > NOW() - INTERVAL '7 days'`,
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM tasks`),
        pool.query(
          `SELECT COUNT(*)::int AS n FROM tasks
           WHERE created_at > NOW() - INTERVAL '7 days'`,
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM partners`),
        pool.query(
          `SELECT COUNT(*)::int AS n FROM partners
           WHERE created_at > NOW() - INTERVAL '7 days'`,
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM session WHERE expire > NOW()`),
        pool.query(`SELECT pg_database_size(current_database())::bigint AS bytes`),
        pool.query(
          `SELECT
             schemaname || '.' || relname AS table,
             pg_total_relation_size(schemaname || '.' || relname)::bigint AS bytes
           FROM pg_stat_user_tables
           ORDER BY bytes DESC
           LIMIT 5`,
        ),
      ]);

      const dbBytes = Number(dbSize.rows[0].bytes);
      const supabaseDbLimitBytes = 500 * 1024 * 1024; // 500 MB free plan

      res.json({
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: {
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        users: {
          total: usersTotal.rows[0].n,
          active7d: usersActive7d.rows[0].n,
          active30d: usersActive30d.rows[0].n,
          new7d: usersNew7d.rows[0].n,
        },
        tasks: {
          total: tasksTotal.rows[0].n,
          new7d: tasksNew7d.rows[0].n,
        },
        partners: {
          total: partnersTotal.rows[0].n,
          new7d: partnersNew7d.rows[0].n,
        },
        sessions: {
          active: sessionsActive.rows[0].n,
        },
        database: {
          sizeMb: Math.round((dbBytes / 1024 / 1024) * 10) / 10,
          usagePct: Math.round((dbBytes / supabaseDbLimitBytes) * 1000) / 10,
          limitMb: supabaseDbLimitBytes / 1024 / 1024,
          topTables: tableSizes.rows.map((r: { table: string; bytes: string }) => ({
            name: r.table,
            sizeMb: Math.round((Number(r.bytes) / 1024 / 1024) * 10) / 10,
          })),
        },
      });
    } catch (err) {
      logger.error({ err }, 'Admin stats error');
      res.status(500).json({ error: 'Failed to compute stats' });
    }
  });

  return router;
}
