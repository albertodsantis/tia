import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type pg from 'pg';
import { isStorageConfigured, uploadFile, deleteFile } from '../lib/storage';
import type {
  AppBootstrapResponse,
  AppNotification,
  BadgeKey,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DashboardSummaryResponse,
  EfisystemAward,
  NotificationsResponse,
  SessionUser,
  SettingsResponse,
  StrategicViewResponse,
  UpdateContactRequest,
  UpdatePartnerRequest,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateTaskRequest,
} from '@shared';
import type { PostgresAppStore } from '../db/repository';
import { GamificationService, checkProfileComplete } from '../services/gamification';
import { evaluateReferralQualification } from '../services/referrals';
import { generateEfiLinkHtml } from '../lib/profileRenderer';
import { createEmptySocialProfiles, createDefaultEfiProfile } from '@shared';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Bad request';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}
function rejectInvalidUUID(res: Response, value: string): boolean {
  if (!isUUID(value)) {
    res.status(400).json({ error: 'ID inválido.' });
    return true;
  }
  return false;
}

/** Require authenticated session — attaches userId to req. Also verifies the user still exists in DB. */
function requireAuth(pool: pg.Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user: SessionUser | undefined = (req.session as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [user.id]);
    if (rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    (req as any).userId = user.id;
    next();
  };
}

function getUserId(req: Request): string {
  return (req as any).userId;
}

function parseTimezoneHeader(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!/^[A-Za-z_+\-/0-9]{1,64}$/.test(value)) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}

export function createV1Router(appStore: PostgresAppStore, pool: pg.Pool, gamification: GamificationService) {
  const router = Router();

  // All v1 routes require authentication
  router.use(requireAuth(pool));

  router.get('/bootstrap', async (req, res) => {
    try {
      const userId = getUserId(req);
      const timezone = parseTimezoneHeader(req.get('X-Timezone'));
      // daily_login awards points; daily_activity drives streak / pipeline-zen / perfect-week state.
      const dailyLoginAward = await gamification.processEvent(userId, 'daily_login', { timezone });
      const dailyActivityAward = await gamification.processEvent(userId, 'daily_activity', { timezone });
      const mergedAward = GamificationService.mergeAwards(dailyLoginAward, dailyActivityAward);
      const [appState, efisystem] = await Promise.all([
        appStore.getSnapshot(userId),
        appStore.getEfisystemSnapshot(userId),
      ]);
      const response: AppBootstrapResponse = {
        appState,
        efisystem,
        ...(mergedAward.pointsEarned > 0 || mergedAward.newBadges.length > 0
          ? { dailyLoginAward: mergedAward }
          : {}),
      };
      res.json(response);
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Profile preview (no DB read — renders from POST body for live editor) ──
  router.post('/preview-profile', (req, res) => {
    try {
      const body = req.body ?? {};
      const socialProfiles = { ...createEmptySocialProfiles(), ...(body.socialProfiles ?? {}) };
      const efiProfile = { ...createDefaultEfiProfile(), ...(body.efiProfile ?? {}) };
      const html = generateEfiLinkHtml({
        name: String(body.name ?? ''),
        handle: String(body.handle ?? ''),
        tagline: String(body.tagline ?? ''),
        avatar: String(body.avatar ?? ''),
        socialProfiles,
        efiProfile,
        accentColor: String(body.accentColor ?? 'gradient:instagram'),
        forceDark: body.forceDark === true,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Preview profile error:', error);
      res.status(500).send('<h1>Error al generar vista previa</h1>');
    }
  });

  router.get('/efisystem', async (req, res) => {
    try {
      res.json(await appStore.getEfisystemSnapshot(getUserId(req)));
    } catch (error) {
      console.error('Efisystem error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/dashboard/summary', async (req, res) => {
    try {
      const userId = getUserId(req);
      const response: DashboardSummaryResponse = await appStore.getDashboardSummary(userId);
      res.json(response);
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/strategic-view', async (req, res) => {
    try {
      const userId = getUserId(req);
      const response: StrategicViewResponse = await appStore.getStrategicView(userId);
      res.json(response);
    } catch (error) {
      console.error('Strategic view error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/tasks', async (req, res) => {
    try {
      res.json(await appStore.listTasks(getUserId(req)));
    } catch (error) {
      console.error('List tasks error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/tasks', async (req, res) => {
    try {
      const userId = getUserId(req);
      const timezone = parseTimezoneHeader(req.get('X-Timezone'));
      const task = await appStore.createTask(userId, req.body as CreateTaskRequest);
      const efisystem = await gamification.processEvent(userId, 'pipeline_first_task', { timezone });
      res.status(201).json({ ...task, efisystem });
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/tasks/:taskId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.taskId)) return;
    try {
      const result = await appStore.deleteTask(getUserId(req), req.params.taskId);
      if (!result.success) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/tasks/:taskId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.taskId)) return;
    try {
      const userId = getUserId(req);
      const timezone = parseTimezoneHeader(req.get('X-Timezone'));
      const body = req.body as UpdateTaskRequest;
      const task = await appStore.updateTask(userId, req.params.taskId, body);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      let efisystem: EfisystemAward | null = null;
      if (body.status === 'Cobrado') {
        efisystem = await gamification.processEvent(userId, 'pipeline_task_paid', { taskId: req.params.taskId, timezone });
      } else if (body.status === 'Completada') {
        efisystem = await gamification.processEvent(userId, 'pipeline_task_completed', { taskId: req.params.taskId, timezone });
      } else if (body.status !== undefined) {
        efisystem = await gamification.processEvent(userId, 'pipeline_task_moved', { timezone });
      }

      if (Array.isArray(body.checklistItems) && body.checklistItems.length > 0) {
        const award = await gamification.processEvent(userId, 'pipeline_first_checklist_item', { timezone });
        if (award.pointsEarned > 0 || award.newBadges.length > 0) {
          efisystem = efisystem ? GamificationService.mergeAwards(efisystem, award) : award;
        }
      }

      // Evaluate referral qualification on status changes. Safe (never throws).
      if (body.status !== undefined) {
        evaluateReferralQualification(pool, userId).catch(() => {});
      }

      res.json({ ...task, ...(efisystem ? { efisystem } : {}) });
    } catch (error) {
      return res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.get('/partners', async (req, res) => {
    try {
      res.json(await appStore.listPartners(getUserId(req)));
    } catch (error) {
      console.error('List partners error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/partners', async (req, res) => {
    try {
      const userId = getUserId(req);
      const partner = await appStore.createPartner(userId, req.body as CreatePartnerRequest);

      // Try first-partner event; if it yields 0 pts, fire subsequent
      let efisystem = await gamification.processEvent(userId, 'network_first_partner');
      if (efisystem.pointsEarned === 0) {
        const subsequent = await gamification.processEvent(userId, 'network_partner_subsequent');
        efisystem = GamificationService.mergeAwards(efisystem, subsequent);
      }

      res.status(201).json({ ...partner, efisystem });
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.patch('/partners/:partnerId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.partnerId)) return;
    try {
      const userId = getUserId(req);
      const body = req.body as UpdatePartnerRequest;
      const partner = await appStore.updatePartner(userId, req.params.partnerId, body);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // If lastContactedAt changed, the 'conector' badge (10 partners touched in 30d)
      // must be re-evaluated — the network_* events don't fire on this endpoint.
      let efisystem: EfisystemAward | null = null;
      if ((body as any).lastContactedAt !== undefined) {
        efisystem = await gamification.reevaluateConectorBadge(userId);
      }

      res.json({ ...partner, ...(efisystem ? { efisystem } : {}) });
    } catch (error) {
      return res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/partners/:partnerId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.partnerId)) return;
    try {
      const result = await appStore.deletePartner(getUserId(req), req.params.partnerId);
      if (!result.success) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('Delete partner error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/partners/:partnerId/contacts', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.partnerId)) return;
    try {
      const userId = getUserId(req);
      const contact = await appStore.addContact(
        userId,
        req.params.partnerId,
        req.body as CreateContactRequest,
      );
      if (!contact) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Try first-contact event; if it yields 0 pts, fire subsequent
      let efisystem = await gamification.processEvent(userId, 'network_first_contact');
      if (efisystem.pointsEarned === 0) {
        const subsequent = await gamification.processEvent(userId, 'network_contact_subsequent');
        efisystem = GamificationService.mergeAwards(efisystem, subsequent);
      }

      res.status(201).json({ ...contact, efisystem });
    } catch (error) {
      return res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.patch('/contacts/:contactId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.contactId)) return;
    try {
      const contact = await appStore.updateContact(
        getUserId(req),
        req.params.contactId,
        req.body as UpdateContactRequest,
      );
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json(contact);
    } catch (error) {
      return res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/contacts/:contactId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.contactId)) return;
    try {
      const result = await appStore.deleteContact(getUserId(req), req.params.contactId);
      if (!result.success) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/profile', async (req, res) => {
    try {
      res.json(await appStore.getProfile(getUserId(req)));
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/profile', async (req, res) => {
    try {
      const userId = getUserId(req);
      const body = req.body as UpdateProfileRequest;
      const profile = await appStore.updateProfile(userId, body);

      let efisystem = null;
      const awards = [];

      // Profile completeness badge
      if (checkProfileComplete(profile)) {
        const award = await gamification.processEvent(userId, 'config_profile_complete');
        awards.push(award);
      }

      // First goal event
      if (body.goals !== undefined) {
        if (profile.goals.length >= 1) {
          const alreadyFired = await appStore.hasTransaction(userId, 'config_first_goal');
          if (!alreadyFired) {
            const award = await gamification.processEvent(userId, 'config_first_goal');
            awards.push(award);
          }
        }

        // Any goal in 'Alcanzado' → fire goal_achieved so visionario_cumplido can re-check.
        // Event is idempotent at the badge layer (unlockBadge dedupes).
        if (profile.goals.some(g => g.status === 'Alcanzado')) {
          const award = await gamification.processEvent(userId, 'goal_achieved');
          awards.push(award);
        }

        // rumbo_fijo (2+ goals) and vision_clara (3+ goals) are normally handled by the
        // gamification service on config_first_goal / goal_achieved, but we also cover the
        // bulk-edit path where the user reaches these counts without either event firing.
        const goalCountBadges: BadgeKey[] = [];
        if (profile.goals.length >= 2 && await appStore.unlockBadge(userId, 'rumbo_fijo')) {
          goalCountBadges.push('rumbo_fijo');
        }
        if (profile.goals.length >= 3 && await appStore.unlockBadge(userId, 'vision_clara')) {
          goalCountBadges.push('vision_clara');
        }
        if (goalCountBadges.length > 0) {
          if (awards.length > 0) {
            awards[0].newBadges.push(...goalCountBadges);
          } else {
            const snap = await appStore.getEfisystemSummary(userId);
            awards.push({
              pointsEarned: 0,
              newTotal: snap.totalPoints,
              newLevel: snap.currentLevel,
              leveledUp: false,
              newBadges: goalCountBadges,
            });
          }
        }
      }

      if (awards.length > 0) {
        efisystem = awards.reduce((acc, cur) => GamificationService.mergeAwards(acc, cur));
      }

      res.json({ ...profile, ...(efisystem ? { efisystem } : {}) });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[PATCH /profile] Error:', message);
      console.error('[PATCH /profile] Stack:', (error as any).stack);
      res.status(400).json({ error: message });
    }
  });

  router.get('/settings', async (req, res) => {
    try {
      const response: SettingsResponse = await appStore.getSettings(getUserId(req));
      res.json(response);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/settings', async (req, res) => {
    try {
      const userId = getUserId(req);
      const body = req.body as UpdateSettingsRequest;
      const response = await appStore.updateSettings(userId, body);

      let efisystem = null;
      if (body.accentColor) {
        const award = await gamification.processEvent(userId, 'config_accent_change');
        // Only surface the award when it actually earned points or unlocked a badge.
        if (award.pointsEarned > 0 || award.newBadges.length > 0) efisystem = award;
      }

      res.json({ ...response, ...(efisystem ? { efisystem } : {}) });
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.get('/templates', async (req, res) => {
    try {
      res.json(await appStore.listTemplates(getUserId(req)));
    } catch (error) {
      console.error('List templates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/templates', async (req, res) => {
    try {
      const template = await appStore.createTemplate(getUserId(req), req.body as CreateTemplateRequest);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/templates/:templateId', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.templateId)) return;
    try {
      const result = await appStore.deleteTemplate(getUserId(req), req.params.templateId);
      if (!result.success) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/tasks/:taskId/status-history', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.taskId)) return;
    try {
      const history = await appStore.getTaskStatusHistory(getUserId(req), req.params.taskId);
      res.json(history);
    } catch (error) {
      console.error('Task status history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/partners/:partnerId/status-history', async (req, res) => {
    if (rejectInvalidUUID(res, req.params.partnerId)) return;
    try {
      const history = await appStore.getPartnerStatusHistory(getUserId(req), req.params.partnerId);
      res.json(history);
    } catch (error) {
      console.error('Partner status history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /* ── Notifications ────────────────────────────────────────── */

  router.get('/notifications', async (req, res) => {
    try {
      const userId = getUserId(req);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const [
        tasksResult,
        goalsResult,
        partnersResult,
        contactsResult,
        efisystem,
        settingsResult,
        goalsAchieved,
        activePartners30d,
        cleanClosures,
        fastCollections,
        streakState,
      ] = await Promise.all([
        pool.query(
          `SELECT id, title, status, due_date, completed_at FROM tasks WHERE user_id = $1`,
          [userId],
        ),
        pool.query(`SELECT id FROM goals WHERE user_id = $1`, [userId]),
        pool.query(`SELECT id FROM partners WHERE user_id = $1`, [userId]),
        pool.query(`SELECT id FROM contacts WHERE user_id = $1`, [userId]),
        appStore.getEfisystemSnapshot(userId),
        pool.query(
          `SELECT last_seen_notifications_at FROM user_settings WHERE user_id = $1`,
          [userId],
        ),
        appStore.countGoalsAchieved(userId),
        appStore.countActivePartners(userId, 30),
        appStore.countTasksCompletedOnOriginalDate(userId),
        appStore.countTasksPaidWithinDays(userId, 7),
        appStore.getStreakState(userId),
      ]);

      const notifications: AppNotification[] = [];

      // ── Agenda ──────────────────────────────────────────────
      const active = tasksResult.rows.filter(
        t => t.status !== 'Completada' && t.status !== 'Cobrado',
      );
      const overdue = active.filter(t => new Date(t.due_date) < today);
      const dueSoon = active.filter(t => {
        const d = new Date(t.due_date);
        return d >= today && d <= threeDaysLater;
      });
      const unpaid = tasksResult.rows.filter(t => t.status === 'Completada');

      if (overdue.length === 1) {
        notifications.push({
          id: `overdue-${overdue[0].id}`,
          category: 'agenda',
          title: 'Entrega vencida',
          body: `"${overdue[0].title}" ya pasó su fecha límite.`,
          actionTab: 'pipeline',
        });
      } else if (overdue.length > 1) {
        notifications.push({
          id: 'overdue-multiple',
          category: 'agenda',
          title: `${overdue.length} entregas vencidas`,
          body: 'Tienes entregas pendientes con fecha límite vencida.',
          actionTab: 'pipeline',
        });
      }

      if (dueSoon.length === 1) {
        notifications.push({
          id: `due-soon-${dueSoon[0].id}`,
          category: 'agenda',
          title: 'Entrega próxima',
          body: `"${dueSoon[0].title}" vence en los próximos 3 días.`,
          actionTab: 'pipeline',
        });
      } else if (dueSoon.length > 1) {
        notifications.push({
          id: 'due-soon-multiple',
          category: 'agenda',
          title: `${dueSoon.length} entregas próximas`,
          body: 'Tienes entregas que vencen en los próximos 3 días.',
          actionTab: 'pipeline',
        });
      }

      if (unpaid.length === 1) {
        notifications.push({
          id: `unpaid-${unpaid[0].id}`,
          category: 'agenda',
          title: 'Cobro pendiente',
          body: `"${unpaid[0].title}" está completa pero sin cobrar.`,
          actionTab: 'pipeline',
        });
      } else if (unpaid.length > 1) {
        notifications.push({
          id: 'unpaid-multiple',
          category: 'agenda',
          title: `${unpaid.length} cobros pendientes`,
          body: 'Tienes entregas completadas que aún no has cobrado.',
          actionTab: 'pipeline',
        });
      }

      // ── Gamificación ─────────────────────────────────────────
      const unlockedBadges = new Set(efisystem.unlockedBadges);
      const goalCount = goalsResult.rows.length;
      const partnerCount = partnersResult.rows.length;
      const contactCount = contactsResult.rows.length;
      const totalTasks = tasksResult.rows.length;
      const completedTasks = tasksResult.rows.filter(
        t => t.status === 'Completada' || t.status === 'Cobrado',
      ).length;
      const paidTasks = tasksResult.rows.filter(t => t.status === 'Cobrado').length;

      type GamificationNudge = AppNotification & { progress: number };
      const nudges: GamificationNudge[] = [];
      const MIN_PROGRESS = 0.3;
      const s = (n: number) => (n === 1 ? '' : 's');
      const pushNudge = (
        key: BadgeKey,
        progress: number,
        build: () => Omit<GamificationNudge, 'progress' | 'category'>,
      ) => {
        if (unlockedBadges.has(key)) return;
        if (progress < MIN_PROGRESS || progress >= 1) return;
        nudges.push({ ...build(), category: 'gamification', progress });
      };

      // ── Volumen: entregas creadas ──────────────────────────────
      pushNudge('motor_de_ideas', totalTasks / 5, () => ({
        id: 'badge-motor-de-ideas',
        title: 'Cerca de "Motor de Ideas"',
        body: `Crea ${5 - totalTasks} entrega${s(5 - totalTasks)} más para desbloquear esta placa.`,
        actionTab: 'pipeline',
      }));
      pushNudge('fabrica_de_proyectos', totalTasks / 25, () => ({
        id: 'badge-fabrica-de-proyectos',
        title: 'Cerca de "Fábrica de Proyectos"',
        body: `Te faltan ${25 - totalTasks} entrega${s(25 - totalTasks)} para desbloquear esta placa.`,
        actionTab: 'pipeline',
      }));

      // ── Volumen: entregas completadas ──────────────────────────
      pushNudge('promesa_cumplida', completedTasks / 10, () => ({
        id: 'badge-promesa-cumplida',
        title: 'Cerca de "Promesa Cumplida"',
        body: `Completa ${10 - completedTasks} entrega${s(10 - completedTasks)} más para desbloquear esta placa.`,
        actionTab: 'pipeline',
      }));
      pushNudge('creador_imparable', completedTasks / 25, () => ({
        id: 'badge-creador-imparable',
        title: 'Cerca de "Creador Imparable"',
        body: `Te faltan ${25 - completedTasks} entrega${s(25 - completedTasks)} completadas para esta placa.`,
        actionTab: 'pipeline',
      }));

      // ── Volumen: entregas cobradas ─────────────────────────────
      pushNudge('negocio_en_marcha', paidTasks / 5, () => ({
        id: 'badge-negocio-en-marcha',
        title: 'Cerca de "Negocio en Marcha"',
        body: `Cobra ${5 - paidTasks} entrega${s(5 - paidTasks)} más para desbloquear esta placa.`,
        actionTab: 'pipeline',
      }));
      pushNudge('lluvia_de_billetes', paidTasks / 20, () => ({
        id: 'badge-lluvia-de-billetes',
        title: 'Cerca de "Lluvia de Billetes"',
        body: `Te faltan ${20 - paidTasks} cobro${s(20 - paidTasks)} para esta placa.`,
        actionTab: 'pipeline',
      }));

      // ── Red ────────────────────────────────────────────────────
      pushNudge('circulo_intimo', partnerCount / 5, () => ({
        id: 'badge-circulo-intimo',
        title: 'Cerca de "Círculo Íntimo"',
        body: `Agrega ${5 - partnerCount} socio${s(5 - partnerCount)} más para desbloquear esta placa.`,
        actionTab: 'directory',
      }));
      {
        const dirProgress = (Math.min(partnerCount, 10) + Math.min(contactCount, 10)) / 20;
        pushNudge('directorio_dorado', dirProgress, () => ({
          id: 'badge-directorio-dorado',
          title: 'Cerca de "Directorio Dorado"',
          body: `Necesitas ${Math.max(0, 10 - partnerCount)} socios y ${Math.max(0, 10 - contactCount)} contactos más.`,
          actionTab: 'directory',
        }));
      }
      pushNudge('conector', activePartners30d / 10, () => ({
        id: 'badge-conector',
        title: 'Cerca de "Conector"',
        body: `Registra contacto con ${10 - activePartners30d} socio${s(10 - activePartners30d)} más en los últimos 30 días.`,
        actionTab: 'directory',
      }));

      // ── Estrategia ─────────────────────────────────────────────
      pushNudge('vision_clara', goalCount / 3, () => ({
        id: 'badge-vision-clara',
        title: 'Cerca de "Visión Clara"',
        body: `Define ${3 - goalCount} objetivo${s(3 - goalCount)} más para desbloquear esta placa.`,
        actionTab: 'strategic',
      }));
      pushNudge('visionario_cumplido', goalsAchieved / 3, () => ({
        id: 'badge-visionario-cumplido',
        title: 'Cerca de "Visionario Cumplido"',
        body: `Marca ${3 - goalsAchieved} objetivo${s(3 - goalsAchieved)} como alcanzado para esta placa.`,
        actionTab: 'strategic',
      }));

      // ── Hábitos ────────────────────────────────────────────────
      pushNudge('cierre_limpio', cleanClosures / 5, () => ({
        id: 'badge-cierre-limpio',
        title: 'Cerca de "Cierre Limpio"',
        body: `Completa ${5 - cleanClosures} entrega${s(5 - cleanClosures)} más en su fecha original.`,
        actionTab: 'pipeline',
      }));
      pushNudge('cobrador_implacable', fastCollections / 5, () => ({
        id: 'badge-cobrador-implacable',
        title: 'Cerca de "Cobrador Implacable"',
        body: `Cobra ${5 - fastCollections} entrega${s(5 - fastCollections)} más dentro de los 7 días de completarlas.`,
        actionTab: 'pipeline',
      }));

      // ── Rachas / Pipeline Zen / Semana Perfecta ────────────────
      const streakDays = streakState.currentStreakDays;
      pushNudge('en_la_zona', streakDays / 3, () => ({
        id: 'badge-en-la-zona',
        title: 'Cerca de "En la Zona"',
        body: `Abre Efi ${3 - streakDays} día${s(3 - streakDays)} más seguidos para esta placa.`,
        actionTab: 'dashboard',
      }));
      pushNudge('racha_de_hierro', streakDays / 7, () => ({
        id: 'badge-racha-de-hierro',
        title: 'Cerca de "Racha de Hierro"',
        body: `Tu racha va en ${streakDays} días — no la rompas, te faltan ${7 - streakDays}.`,
        actionTab: 'dashboard',
      }));
      pushNudge('inamovible', streakDays / 30, () => ({
        id: 'badge-inamovible',
        title: 'Cerca de "Inamovible"',
        body: `Llevas ${streakDays} días de racha. Te faltan ${30 - streakDays} para esta placa.`,
        actionTab: 'dashboard',
      }));
      pushNudge('pipeline_zen', streakState.cleanPipelineDays / 7, () => ({
        id: 'badge-pipeline-zen',
        title: 'Cerca de "Pipeline Zen"',
        body: `Llevas ${streakState.cleanPipelineDays} día${s(streakState.cleanPipelineDays)} sin entregas vencidas. Te faltan ${7 - streakState.cleanPipelineDays}.`,
        actionTab: 'pipeline',
      }));
      pushNudge('mes_de_oro', streakState.perfectWeeksCount / 4, () => ({
        id: 'badge-mes-de-oro',
        title: 'Cerca de "Mes de Oro"',
        body: `Llevas ${streakState.perfectWeeksCount} semana${s(streakState.perfectWeeksCount)} perfecta${s(streakState.perfectWeeksCount)} este mes. Te faltan ${4 - streakState.perfectWeeksCount}.`,
        actionTab: 'dashboard',
      }));

      // Add top 3 gamification nudges sorted by proximity to goal
      nudges.sort((a, b) => b.progress - a.progress);
      for (const { progress: _p, ...nudge } of nudges.slice(0, 3)) {
        notifications.push(nudge);
      }

      // ── hasUnread ─────────────────────────────────────────────
      const lastSeen: Date | null = settingsResult.rows[0]?.last_seen_notifications_at ?? null;
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const hasUnread = notifications.length > 0 && (!lastSeen || lastSeen < eightHoursAgo);

      const response: NotificationsResponse = { notifications, hasUnread };
      res.json(response);
    } catch (error) {
      console.error('Notifications error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/notifications/seen', async (req, res) => {
    try {
      const userId = getUserId(req);
      await pool.query(
        `INSERT INTO user_settings (user_id, last_seen_notifications_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_seen_notifications_at = NOW()`,
        [userId],
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Notifications seen error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /* ── File uploads (Supabase Storage) ─────────────────────── */

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  router.get('/uploads/status', (_req, res) => {
    res.json({ enabled: isStorageConfigured() });
  });

  router.post('/uploads', upload.single('file'), async (req, res) => {
    try {
      if (!isStorageConfigured()) {
        return res.status(503).json({ error: 'Subida de archivos no configurada. Faltan variables de Supabase.' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo.' });
      }

      const category = (req.body.category as string) || 'general';
      const result = await uploadFile(getUserId(req), category, file);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/uploads', async (req, res) => {
    try {
      const { path } = req.body as { path: string };
      if (!path) {
        return res.status(400).json({ error: 'Se requiere el path del archivo.' });
      }
      await deleteFile(getUserId(req), path);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  return router;
}
