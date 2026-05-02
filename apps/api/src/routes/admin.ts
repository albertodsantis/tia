import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import { timingSafeEqual } from 'crypto';
import { logger } from '../lib/logger';
import { createClient } from '@supabase/supabase-js';
import { redeemAllReferralCredits } from '../services/referrals';

const TASK_STATUSES = ['Pendiente', 'En Progreso', 'En Revisión', 'Completada', 'Cobrado'] as const;
const SUPABASE_DB_LIMIT_BYTES = 500 * 1024 * 1024; // Supabase free tier
const SUPABASE_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB free tier
const STORAGE_BUCKET = 'efiimages';

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

async function getStorageUsage(): Promise<{ bytes: number; objects: number } | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    const client = createClient(url, key);
    let bytes = 0;
    let objects = 0;
    const stack = [''];
    while (stack.length) {
      const prefix = stack.pop()!;
      const { data: items, error: err } = await client.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit: 1000 });
      if (err || !items) continue;
      for (const item of items) {
        if (item.id === null) {
          stack.push(prefix ? `${prefix}/${item.name}` : item.name);
        } else {
          objects += 1;
          const size = (item.metadata as { size?: number } | null)?.size ?? 0;
          bytes += size;
        }
      }
    }
    return { bytes, objects };
  } catch (err) {
    logger.warn({ err }, 'Storage usage query failed');
    return null;
  }
}

interface AdminStats {
  timestamp: string;
  uptime: number;
  memory: { rssMb: number; heapUsedMb: number };
  users: {
    total: number;
    active7d: number;
    active30d: number;
    new7d: number;
    dau: number;
    wau: number;
    mau: number;
    retained7d: number;
    byProvider: Array<{ provider: string; count: number }>;
    byPlan: Array<{ plan: string; count: number }>;
  };
  funnel: {
    signed_up: number;
    set_profession: number;
    created_first_partner: number;
    created_first_task: number;
    published_profile: number;
  };
  tasks: {
    total: number;
    new7d: number;
    byStatus: Array<{ status: string; count: number }>;
    medianPerActiveUser: number;
  };
  partners: {
    total: number;
    new7d: number;
  };
  professions: Array<{ profession: string; count: number }>;
  signupsDaily: Array<{ day: string; count: number }>;
  dauDaily: Array<{ day: string; count: number }>;
  sessions: { active: number };
  integrations: {
    gcalConnected: number;
  };
  database: {
    sizeMb: number;
    usagePct: number;
    limitMb: number;
    topTables: Array<{ name: string; sizeMb: number }>;
  };
  storage:
    | {
        sizeMb: number;
        usagePct: number;
        limitMb: number;
        objects: number;
      }
    | null;
  scaling: ScalingAlert[];
}

type AlertLevel = 'ok' | 'warn' | 'danger';

interface ScalingAlert {
  service: string;
  level: AlertLevel;
  title: string;
  detail: string;
  action: string;
  link?: string;
}

function evaluateScaling(s: Omit<AdminStats, 'scaling'>): ScalingAlert[] {
  const alerts: ScalingAlert[] = [];

  // Supabase DB — warn 60%, danger 70%
  const dbPct = s.database.usagePct;
  alerts.push({
    service: 'Supabase DB',
    level: dbPct >= 70 ? 'danger' : dbPct >= 60 ? 'warn' : 'ok',
    title: `Base de datos ${s.database.sizeMb} MB / ${s.database.limitMb} MB`,
    detail:
      dbPct >= 70
        ? `${dbPct}% usado — cerca del límite del plan Free`
        : dbPct >= 60
          ? `${dbPct}% usado — empezar a planificar upgrade`
          : `${dbPct}% usado — holgura suficiente`,
    action:
      dbPct >= 70
        ? 'Upgrade Supabase a Pro ($25/mes, 8 GB DB, 100 GB storage)'
        : dbPct >= 60
          ? 'Revisar tablas pesadas; considerar upgrade próximo'
          : 'Sin acción',
    link: dbPct >= 60 ? 'https://supabase.com/dashboard' : undefined,
  });

  // Supabase Storage — warn 60%, danger 70%. Doc dice que es el primero en agotarse.
  if (s.storage) {
    const stPct = s.storage.usagePct;
    alerts.push({
      service: 'Supabase Storage',
      level: stPct >= 70 ? 'danger' : stPct >= 60 ? 'warn' : 'ok',
      title: `Storage ${s.storage.sizeMb} MB / ${s.storage.limitMb} MB`,
      detail:
        stPct >= 70
          ? `${stPct}% usado — este es el recurso que se agota primero`
          : stPct >= 60
            ? `${stPct}% usado — vigilar, crece con uploads`
            : `${stPct}% usado — ${s.storage.objects} archivos`,
      action:
        stPct >= 70
          ? 'Upgrade Supabase a Pro (100 GB storage) o limpiar archivos huérfanos'
          : stPct >= 60
            ? 'Auditar uploads antiguos; considerar límite por usuario'
            : 'Sin acción',
      link: stPct >= 60 ? 'https://supabase.com/dashboard' : undefined,
    });
  }

  // Railway RAM — límite 8 GB por replica en Hobby. Warn 5700 (~70%), danger 7370 (~90%).
  const rssMb = s.memory.rssMb;
  const ramLimit = 8192;
  const ramPct = Math.round((rssMb / ramLimit) * 100);
  alerts.push({
    service: 'Railway RAM',
    level: rssMb >= 7370 ? 'danger' : rssMb >= 5700 ? 'warn' : 'ok',
    title: `${rssMb} MB RSS / ${ramLimit} MB plan Hobby`,
    detail:
      rssMb >= 7370
        ? `${ramPct}% — riesgo de OOM kill`
        : rssMb >= 5700
          ? `${ramPct}% — picos podrían saturar`
          : `${ramPct}% — estable`,
    action:
      rssMb >= 7370
        ? 'Subir a Pro o escalar a más replicas YA'
        : rssMb >= 5700
          ? 'Vigilar logs por OOM; revisar consumo de memoria'
          : 'Sin acción',
    link: rssMb >= 5700 ? 'https://railway.app' : undefined,
  });

  // Railway — escala con usuarios activos. Hobby aguanta más, pero vigilar concurrencia a partir de 1k MAU.
  const mau = s.users.mau;
  alerts.push({
    service: 'Railway carga',
    level: mau >= 2000 ? 'danger' : mau >= 1000 ? 'warn' : 'ok',
    title: `${mau} usuarios activos (MAU)`,
    detail:
      mau >= 2000
        ? `>2000 MAU — Hobby al límite bajo concurrencia`
        : mau >= 1000
          ? `entre 1000-2000 MAU — preparar siguiente upgrade`
          : `<1000 MAU — plan Hobby holgado`,
    action:
      mau >= 2000
        ? 'Subir a Pro o añadir replicas YA'
        : mau >= 1000
          ? 'Preparar upgrade a Railway Pro'
          : 'Sin acción',
    link: mau >= 1000 ? 'https://railway.app' : undefined,
  });

  // Resend — no tenemos contador interno. Recordatorio manual si hay >500 usuarios.
  if (s.users.total >= 500) {
    alerts.push({
      service: 'Resend',
      level: 'warn',
      title: `${s.users.total} usuarios registrados`,
      detail: 'Con 3 emails/usuario se acerca al límite de 3.000/mes',
      action: 'Revisar contador en dashboard Resend; upgrade a Pro si >2.500/mes',
      link: 'https://resend.com/emails',
    });
  }

  return alerts;
}

async function computeStats(pool: pg.Pool): Promise<AdminStats> {
  const [
    usersTotal,
    usersActive7d,
    usersActive30d,
    usersNew7d,
    dau,
    wau,
    mau,
    retained7d,
    usersByProvider,
    usersByPlan,
    funnelSetProfession,
    funnelFirstPartner,
    funnelFirstTask,
    funnelPublishedProfile,
    tasksTotal,
    tasksNew7d,
    tasksByStatus,
    medianTasksPerActive,
    partnersTotal,
    partnersNew7d,
    professions,
    signupsDaily,
    dauDaily,
    sessionsActive,
    gcalConnected,
    dbSize,
    tableSizes,
  ] = await Promise.all([
    pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM users`),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
       WHERE changed_at > NOW() - INTERVAL '7 days'`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
       WHERE changed_at > NOW() - INTERVAL '30 days'`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users
       WHERE created_at > NOW() - INTERVAL '7 days'`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
       WHERE changed_at > NOW() - INTERVAL '1 day'`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
       WHERE changed_at > NOW() - INTERVAL '7 days'`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM task_status_history
       WHERE changed_at > NOW() - INTERVAL '30 days'`,
    ),
    pool.query<{ n: number }>(
      `WITH last_week_signups AS (
         SELECT id FROM users
         WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
       )
       SELECT COUNT(DISTINCT h.user_id)::int AS n
       FROM task_status_history h
       JOIN last_week_signups u ON u.id = h.user_id
       WHERE h.changed_at > NOW() - INTERVAL '7 days'`,
    ),
    pool.query<{ provider: string; count: number }>(
      `SELECT provider, COUNT(*)::int AS count FROM users GROUP BY provider ORDER BY count DESC`,
    ),
    pool.query<{ plan: string; count: number }>(
      `SELECT plan, COUNT(*)::int AS count FROM users GROUP BY plan ORDER BY count DESC`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM user_profile
       WHERE primary_profession IS NOT NULL AND primary_profession <> ''`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM partners`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM tasks`,
    ),
    pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM user_profile
       WHERE efi_profile <> '{}'::jsonb AND handle <> ''`,
    ),
    pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM tasks`),
    pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM tasks
       WHERE created_at > NOW() - INTERVAL '7 days'`,
    ),
    pool.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*)::int AS count FROM tasks GROUP BY status`,
    ),
    pool.query<{ median: string | null }>(
      `WITH per_user AS (
         SELECT user_id, COUNT(*) AS n FROM tasks GROUP BY user_id
       )
       SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY n)::text AS median FROM per_user`,
    ),
    pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM partners`),
    pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM partners
       WHERE created_at > NOW() - INTERVAL '7 days'`,
    ),
    pool.query<{ profession: string; count: number }>(
      `SELECT COALESCE(NULLIF(primary_profession, ''), '(sin definir)') AS profession,
              COUNT(*)::int AS count
       FROM user_profile
       GROUP BY profession
       ORDER BY count DESC
       LIMIT 10`,
    ),
    pool.query<{ day: string; count: number }>(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
              COUNT(*)::int AS count
       FROM users
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY day
       ORDER BY day`,
    ),
    pool.query<{ day: string; count: number }>(
      `SELECT TO_CHAR(DATE_TRUNC('day', changed_at), 'YYYY-MM-DD') AS day,
              COUNT(DISTINCT user_id)::int AS count
       FROM task_status_history
       WHERE changed_at > NOW() - INTERVAL '30 days'
       GROUP BY day
       ORDER BY day`,
    ),
    pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM session WHERE expire > NOW()`),
    pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users WHERE gcal_refresh_token IS NOT NULL`,
    ),
    pool.query<{ bytes: string }>(`SELECT pg_database_size(current_database())::bigint AS bytes`),
    pool.query<{ table: string; bytes: string }>(
      `SELECT schemaname || '.' || relname AS table,
              pg_total_relation_size(schemaname || '.' || relname)::bigint AS bytes
       FROM pg_stat_user_tables
       ORDER BY bytes DESC
       LIMIT 5`,
    ),
  ]);

  const storage = await getStorageUsage();
  const dbBytes = Number(dbSize.rows[0].bytes);
  const newUsers7d = usersNew7d.rows[0].n;
  const retainedCount = retained7d.rows[0].n;

  const base: Omit<AdminStats, 'scaling'> = {
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
      new7d: newUsers7d,
      dau: dau.rows[0].n,
      wau: wau.rows[0].n,
      mau: mau.rows[0].n,
      retained7d: retainedCount,
      byProvider: usersByProvider.rows,
      byPlan: usersByPlan.rows,
    },
    funnel: {
      signed_up: usersTotal.rows[0].n,
      set_profession: funnelSetProfession.rows[0].n,
      created_first_partner: funnelFirstPartner.rows[0].n,
      created_first_task: funnelFirstTask.rows[0].n,
      published_profile: funnelPublishedProfile.rows[0].n,
    },
    tasks: {
      total: tasksTotal.rows[0].n,
      new7d: tasksNew7d.rows[0].n,
      byStatus: TASK_STATUSES.map((s) => ({
        status: s,
        count: tasksByStatus.rows.find((r) => r.status === s)?.count ?? 0,
      })),
      medianPerActiveUser: Math.round(Number(medianTasksPerActive.rows[0].median ?? 0) * 10) / 10,
    },
    partners: {
      total: partnersTotal.rows[0].n,
      new7d: partnersNew7d.rows[0].n,
    },
    professions: professions.rows,
    signupsDaily: signupsDaily.rows,
    dauDaily: dauDaily.rows,
    sessions: { active: sessionsActive.rows[0].n },
    integrations: {
      gcalConnected: gcalConnected.rows[0].n,
    },
    database: {
      sizeMb: Math.round((dbBytes / 1024 / 1024) * 10) / 10,
      usagePct: Math.round((dbBytes / SUPABASE_DB_LIMIT_BYTES) * 1000) / 10,
      limitMb: SUPABASE_DB_LIMIT_BYTES / 1024 / 1024,
      topTables: tableSizes.rows.map((r) => ({
        name: r.table,
        sizeMb: Math.round((Number(r.bytes) / 1024 / 1024) * 10) / 10,
      })),
    },
    storage: storage
      ? {
          sizeMb: Math.round((storage.bytes / 1024 / 1024) * 10) / 10,
          usagePct: Math.round((storage.bytes / SUPABASE_STORAGE_LIMIT_BYTES) * 1000) / 10,
          limitMb: SUPABASE_STORAGE_LIMIT_BYTES / 1024 / 1024,
          objects: storage.objects,
        }
      : null,
  };

  return { ...base, scaling: evaluateScaling(base) };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function sparkline(points: number[], width = 160, height = 36): string {
  if (points.length === 0) return '';
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - (p / max) * (height - 4) - 2).toFixed(1)}`)
    .join(' ');
  const last = points[points.length - 1];
  const lastX = (points.length - 1) * step;
  const lastY = height - (last / max) * (height - 4) - 2;
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="spark">
    <polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.5" fill="currentColor" />
  </svg>`;
}

function renderHtml(s: AdminStats, key: string): string {
  const funnelStages: Array<[string, number]> = [
    ['Registro', s.funnel.signed_up],
    ['Profesión', s.funnel.set_profession],
    ['Primer partner', s.funnel.created_first_partner],
    ['Primera tarea', s.funnel.created_first_task],
    ['Perfil público', s.funnel.published_profile],
  ];
  const funnelMax = Math.max(...funnelStages.map(([, n]) => n), 1);

  const totalTasks = s.tasks.total || 1;

  const signupPoints = s.signupsDaily.map((d) => d.count);
  const dauPoints = s.dauDaily.map((d) => d.count);

  const statusColors: Record<string, string> = {
    Pendiente: '#94a3b8',
    'En Progreso': '#3b82f6',
    'En Revisión': '#f59e0b',
    Completada: '#10b981',
    Cobrado: '#8b5cf6',
  };

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Efi · Admin</title>
<style>
  :root {
    --accent: #C96F5B;
    --bg: #fafaf9;
    --card: #ffffff;
    --border: #e7e5e4;
    --text: #1c1917;
    --muted: #78716c;
    --good: #10b981;
    --warn: #f59e0b;
    --danger: #ef4444;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--card);
  }
  header h1 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
  header h1 span { color: var(--accent); }
  header .meta { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  main { max-width: 1200px; margin: 0 auto; padding: 24px; }
  section { margin-bottom: 28px; }
  section h2 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 10px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
  }
  .card .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .card .value { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .card .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .card .sub.good { color: var(--good); }
  .card .spark-wrap { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .spark { color: var(--accent); margin-top: 6px; }
  .progress { position: relative; height: 6px; background: #f1f0ed; border-radius: 4px; overflow: hidden; margin-top: 8px; }
  .progress-bar { position: absolute; inset: 0; background: var(--accent); border-radius: 4px; }
  .progress-bar.warn { background: var(--warn); }
  .progress-bar.danger { background: var(--danger); }
  .funnel { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .funnel-row { display: grid; grid-template-columns: 140px 1fr 80px; align-items: center; gap: 12px; padding: 6px 0; font-variant-numeric: tabular-nums; }
  .funnel-row + .funnel-row { border-top: 1px solid var(--border); }
  .funnel-row .label { color: var(--muted); font-size: 12px; }
  .funnel-bar { height: 10px; background: #f1f0ed; border-radius: 4px; overflow: hidden; }
  .funnel-bar-fill { height: 100%; background: var(--accent); border-radius: 4px; }
  .funnel-row .num { font-weight: 600; text-align: right; }
  .funnel-row .pct { font-size: 11px; color: var(--muted); font-weight: 400; margin-left: 6px; }
  .status-row { display: grid; grid-template-columns: 120px 1fr 80px; align-items: center; gap: 12px; padding: 6px 0; font-variant-numeric: tabular-nums; }
  .status-row + .status-row { border-top: 1px solid var(--border); }
  .status-bar { height: 10px; background: #f1f0ed; border-radius: 4px; overflow: hidden; }
  .status-bar-fill { height: 100%; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table th, table td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
  table th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  table td.num { text-align: right; }
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 720px) { .split { grid-template-columns: 1fr; } }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f5f5f4; font-size: 11px; color: var(--muted); }
  footer { text-align: center; color: var(--muted); font-size: 12px; padding: 16px; }
  a { color: var(--accent); }
  .alerts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }
  .alert { border-radius: 10px; border: 1px solid var(--border); background: var(--card); padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start; }
  .alert.ok { border-left: 4px solid var(--good); }
  .alert.warn { border-left: 4px solid var(--warn); background: #fffbeb; }
  .alert.danger { border-left: 4px solid var(--danger); background: #fef2f2; }
  .alert-icon { font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 2px; }
  .alert-body { flex: 1; min-width: 0; }
  .alert-service { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .alert-title { font-size: 14px; font-weight: 600; margin-top: 1px; }
  .alert-detail { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .alert-action { font-size: 12px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border); }
  .alert.ok .alert-action { color: var(--muted); }
  .alert.warn .alert-action { color: #92400e; font-weight: 500; }
  .alert.danger .alert-action { color: #991b1b; font-weight: 600; }
</style>
</head>
<body>
<header>
  <h1>efi <span>· admin</span></h1>
  <div class="meta">
    Actualizado ${new Date(s.timestamp).toLocaleString('es-ES')}
    · <a href="/api/admin/stats?key=${encodeURIComponent(key)}">JSON</a>
  </div>
</header>
<main>

  <section>
    <h2>Escalada · triggers de infra</h2>
    <div class="alerts">
      ${s.scaling
        .map((a) => {
          const icon = a.level === 'danger' ? '🔴' : a.level === 'warn' ? '🟡' : '🟢';
          const actionHtml = a.link
            ? `<a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.action)} →</a>`
            : escapeHtml(a.action);
          return `<div class="alert ${a.level}">
            <div class="alert-icon">${icon}</div>
            <div class="alert-body">
              <div class="alert-service">${escapeHtml(a.service)}</div>
              <div class="alert-title">${escapeHtml(a.title)}</div>
              <div class="alert-detail">${escapeHtml(a.detail)}</div>
              <div class="alert-action">${actionHtml}</div>
            </div>
          </div>`;
        })
        .join('')}
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--muted)">
      Plan completo en <code>Documentation/INFRASTRUCTURE_SCALING.md</code>
    </div>
  </section>

  <section>
    <h2>Usuarios</h2>
    <div class="grid">
      <div class="card">
        <div class="label">Total</div>
        <div class="value">${s.users.total}</div>
        <div class="sub">${s.users.new7d > 0 ? `+${s.users.new7d} esta semana` : 'sin altas recientes'}</div>
      </div>
      <div class="card">
        <div class="label">DAU / WAU / MAU</div>
        <div class="value">${s.users.dau} <span style="color:var(--muted);font-weight:400;font-size:16px">/ ${s.users.wau} / ${s.users.mau}</span></div>
        <div class="sub">activos diarios / semanales / mensuales</div>
      </div>
      <div class="card">
        <div class="label">Retención 7d</div>
        <div class="value">${s.users.retained7d}</div>
        <div class="sub">de cohorte de hace 7-14 días</div>
      </div>
      <div class="card">
        <div class="label">Sesiones activas</div>
        <div class="value">${s.sessions.active}</div>
        <div class="sub">logins vigentes</div>
      </div>
    </div>
  </section>

  <section>
    <h2>Crecimiento · últimos 30 días</h2>
    <div class="split">
      <div class="card">
        <div class="spark-wrap">
          <div>
            <div class="label">Altas por día</div>
            <div class="value">${signupPoints.reduce((a, b) => a + b, 0)}</div>
          </div>
          ${sparkline(signupPoints)}
        </div>
      </div>
      <div class="card">
        <div class="spark-wrap">
          <div>
            <div class="label">Usuarios activos por día</div>
            <div class="value">${dauPoints.length > 0 ? dauPoints[dauPoints.length - 1] : 0}</div>
          </div>
          ${sparkline(dauPoints)}
        </div>
      </div>
    </div>
  </section>

  <section>
    <h2>Funnel de activación</h2>
    <div class="funnel">
      ${funnelStages
        .map(([label, n]) => {
          const pct = ((n / funnelMax) * 100).toFixed(1);
          const relPct = s.funnel.signed_up > 0 ? Math.round((n / s.funnel.signed_up) * 100) : 0;
          return `<div class="funnel-row">
            <div class="label">${escapeHtml(label)}</div>
            <div class="funnel-bar"><div class="funnel-bar-fill" style="width:${pct}%"></div></div>
            <div class="num">${n}<span class="pct">${relPct}%</span></div>
          </div>`;
        })
        .join('')}
    </div>
  </section>

  <section>
    <h2>Contenido</h2>
    <div class="grid">
      <div class="card">
        <div class="label">Tareas totales</div>
        <div class="value">${s.tasks.total}</div>
        <div class="sub">+${s.tasks.new7d} esta semana · mediana ${s.tasks.medianPerActiveUser}/usuario</div>
      </div>
      <div class="card">
        <div class="label">Partners totales</div>
        <div class="value">${s.partners.total}</div>
        <div class="sub">+${s.partners.new7d} esta semana</div>
      </div>
      <div class="card">
        <div class="label">Google Calendar</div>
        <div class="value">${s.integrations.gcalConnected}</div>
        <div class="sub">usuarios conectados</div>
      </div>
      <div class="card">
        <div class="label">Perfiles publicados</div>
        <div class="value">${s.funnel.published_profile}</div>
        <div class="sub">con EfiLink activo</div>
      </div>
    </div>
  </section>

  <section>
    <h2>Tareas por estado</h2>
    <div class="funnel">
      ${s.tasks.byStatus
        .map((r) => {
          const pct = totalTasks > 0 ? ((r.count / totalTasks) * 100).toFixed(1) : '0';
          return `<div class="status-row">
            <div class="label">${escapeHtml(r.status)}</div>
            <div class="status-bar"><div class="status-bar-fill" style="width:${pct}%;background:${statusColors[r.status] ?? 'var(--accent)'}"></div></div>
            <div class="num">${r.count}<span class="pct">${pct}%</span></div>
          </div>`;
        })
        .join('')}
    </div>
  </section>

  <section>
    <h2>Top profesiones</h2>
    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr><th>Profesión</th><th class="num">Usuarios</th></tr></thead>
        <tbody>
          ${s.professions
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.profession)}</td><td class="num">${r.count}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>Infraestructura</h2>
    <div class="grid">
      <div class="card">
        <div class="label">Base de datos</div>
        <div class="value">${s.database.sizeMb} MB</div>
        <div class="sub">${s.database.usagePct}% de ${s.database.limitMb} MB</div>
        <div class="progress"><div class="progress-bar ${s.database.usagePct > 80 ? 'danger' : s.database.usagePct > 60 ? 'warn' : ''}" style="width:${Math.min(s.database.usagePct, 100)}%"></div></div>
      </div>
      ${
        s.storage
          ? `<div class="card">
            <div class="label">Storage</div>
            <div class="value">${s.storage.sizeMb} MB</div>
            <div class="sub">${s.storage.usagePct}% de ${s.storage.limitMb} MB · ${s.storage.objects} archivos</div>
            <div class="progress"><div class="progress-bar ${s.storage.usagePct > 80 ? 'danger' : s.storage.usagePct > 60 ? 'warn' : ''}" style="width:${Math.min(s.storage.usagePct, 100)}%"></div></div>
          </div>`
          : `<div class="card">
            <div class="label">Storage</div>
            <div class="value" style="font-size:16px;color:var(--muted)">no disponible</div>
            <div class="sub">configurar SUPABASE_SERVICE_KEY</div>
          </div>`
      }
      <div class="card">
        <div class="label">Memoria</div>
        <div class="value">${s.memory.rssMb} MB</div>
        <div class="sub">heap ${s.memory.heapUsedMb} MB</div>
      </div>
      <div class="card">
        <div class="label">Uptime</div>
        <div class="value">${formatUptime(s.uptime)}</div>
        <div class="sub">desde último deploy</div>
      </div>
    </div>
  </section>

  <section>
    <div class="split">
      <div>
        <h2>Top tablas</h2>
        <div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead><tr><th>Tabla</th><th class="num">Tamaño</th></tr></thead>
            <tbody>
              ${s.database.topTables
                .map(
                  (t) =>
                    `<tr><td>${escapeHtml(t.name)}</td><td class="num">${t.sizeMb} MB</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2>Usuarios por proveedor / plan</h2>
        <div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead><tr><th>Segmento</th><th class="num">Usuarios</th></tr></thead>
            <tbody>
              ${s.users.byProvider
                .map(
                  (r) =>
                    `<tr><td><span class="pill">provider</span> ${escapeHtml(r.provider)}</td><td class="num">${r.count}</td></tr>`,
                )
                .join('')}
              ${s.users.byPlan
                .map(
                  (r) =>
                    `<tr><td><span class="pill">plan</span> ${escapeHtml(r.plan)}</td><td class="num">${r.count}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

</main>
<footer>
  Auto-refresh cada 60s · <a href="#" onclick="location.reload();return false">refrescar ahora</a>
</footer>
<script>setTimeout(() => location.reload(), 60000);</script>
</body>
</html>`;
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
      const stats = await computeStats(pool);
      res.json(stats);
    } catch (err) {
      logger.error({ err }, 'Admin stats error');
      res.status(500).json({ error: 'Failed to compute stats' });
    }
  });

  // One-shot endpoint to redeem all unredeemed referral credits into
  // subscription time (extends users.subscribed_until). Idempotent — credits
  // already redeemed are skipped. Call this right after flipping EARLY_ACCESS
  // to false so users immediately see their earned months.
  router.post('/referrals/redeem-all', async (_req, res) => {
    try {
      const summary = await redeemAllReferralCredits(pool);
      logger.info({ summary }, 'Referral credits redeemed');
      res.json({ ok: true, ...summary });
    } catch (err) {
      logger.error({ err }, 'Referral redeem-all failed');
      res.status(500).json({ error: 'Failed to redeem credits' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const stats = await computeStats(pool);
      const key = typeof req.query.key === 'string' ? req.query.key : '';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(renderHtml(stats, key));
    } catch (err) {
      logger.error({ err }, 'Admin dashboard error');
      res.status(500).send('Failed to render dashboard');
    }
  });

  return router;
}
