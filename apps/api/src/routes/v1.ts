import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type pg from 'pg';
import { isStorageConfigured, uploadFile, deleteFile } from '../lib/storage';
import type {
  AppBootstrapResponse,
  AppNotification,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DashboardSummaryResponse,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Bad request';
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

export function createV1Router(appStore: PostgresAppStore, pool: pg.Pool, gamification: GamificationService) {
  const router = Router();

  // All v1 routes require authentication
  router.use(requireAuth(pool));

  router.get('/bootstrap', async (req, res) => {
    try {
      const userId = getUserId(req);
      const [appState, efisystem] = await Promise.all([
        appStore.getSnapshot(userId),
        appStore.getEfisystemSnapshot(userId),
      ]);
      const response: AppBootstrapResponse = { appState, efisystem };
      res.json(response);
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      const task = await appStore.createTask(userId, req.body as CreateTaskRequest);
      const efisystem = await gamification.processEvent(userId, 'pipeline_first_task');
      res.status(201).json({ ...task, efisystem });
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.delete('/tasks/:taskId', async (req, res) => {
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
    try {
      const userId = getUserId(req);
      const body = req.body as UpdateTaskRequest;
      const task = await appStore.updateTask(userId, req.params.taskId, body);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      let efisystem = null;
      if (body.status === 'Cobrado') {
        efisystem = await gamification.processEvent(userId, 'pipeline_task_paid');
      } else if (body.status === 'Completada') {
        efisystem = await gamification.processEvent(userId, 'pipeline_task_completed');
      } else if (body.status !== undefined) {
        efisystem = await gamification.processEvent(userId, 'pipeline_task_moved');
      } else if (Array.isArray(body.checklistItems) && body.checklistItems.length > 0) {
        const award = await gamification.processEvent(userId, 'pipeline_first_checklist_item');
        if (award.pointsEarned > 0) efisystem = award;
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
    try {
      const partner = await appStore.updatePartner(
        getUserId(req),
        req.params.partnerId,
        req.body as UpdatePartnerRequest,
      );
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      return res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  router.post('/partners/:partnerId/contacts', async (req, res) => {
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
      console.log('[PATCH /profile] efiProfile received:', JSON.stringify(body.efiProfile));
      const profile = await appStore.updateProfile(userId, body);
      console.log('[PATCH /profile] efiProfile saved:', JSON.stringify(profile.efiProfile));

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

        // vision_clara badge: 3+ goals
        if (profile.goals.length >= 3) {
          const isNew = await appStore.unlockBadge(userId, 'vision_clara');
          if (isNew) {
            // Attach the badge to the first award or create a synthetic one
            if (awards.length > 0) {
              awards[0].newBadges.push('vision_clara');
            } else {
              const snap = await appStore.getEfisystemSummary(userId);
              awards.push({
                pointsEarned: 0,
                newTotal: snap.totalPoints,
                newLevel: snap.currentLevel,
                leveledUp: false,
                newBadges: ['vision_clara' as const],
              });
            }
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
        efisystem = await gamification.processEvent(userId, 'config_accent_change');
        if (efisystem.pointsEarned === 0) efisystem = null; // don't noise up response if no points
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
    try {
      const history = await appStore.getTaskStatusHistory(getUserId(req), req.params.taskId);
      res.json(history);
    } catch (error) {
      console.error('Task status history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/partners/:partnerId/status-history', async (req, res) => {
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

      const [tasksResult, goalsResult, partnersResult, contactsResult, efisystem, settingsResult] =
        await Promise.all([
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

      if (!unlockedBadges.has('vision_clara') && goalCount > 0 && goalCount < 3) {
        const missing = 3 - goalCount;
        nudges.push({
          id: 'badge-vision-clara',
          category: 'gamification',
          title: 'Cerca de "Visión Clara"',
          body: `Define ${missing} objetivo${missing > 1 ? 's' : ''} más para desbloquear esta placa.`,
          actionTab: 'strategic',
          progress: goalCount / 3,
        });
      }
      if (!unlockedBadges.has('circulo_intimo') && partnerCount > 0 && partnerCount < 5) {
        const missing = 5 - partnerCount;
        nudges.push({
          id: 'badge-circulo-intimo',
          category: 'gamification',
          title: 'Cerca de "Círculo Íntimo"',
          body: `Agrega ${missing} socio${missing > 1 ? 's' : ''} más para desbloquear esta placa.`,
          actionTab: 'directory',
          progress: partnerCount / 5,
        });
      }
      if (!unlockedBadges.has('directorio_dorado') && (partnerCount >= 7 || contactCount >= 7)) {
        const p = Math.min(partnerCount, 10) / 10;
        const c = Math.min(contactCount, 10) / 10;
        nudges.push({
          id: 'badge-directorio-dorado',
          category: 'gamification',
          title: 'Cerca de "Directorio Dorado"',
          body: `Necesitas ${Math.max(0, 10 - partnerCount)} socios y ${Math.max(0, 10 - contactCount)} contactos más.`,
          actionTab: 'directory',
          progress: (p + c) / 2,
        });
      }
      if (!unlockedBadges.has('motor_de_ideas') && totalTasks > 0 && totalTasks < 5) {
        const missing = 5 - totalTasks;
        nudges.push({
          id: 'badge-motor-de-ideas',
          category: 'gamification',
          title: 'Cerca de "Motor de Ideas"',
          body: `Crea ${missing} entrega${missing > 1 ? 's' : ''} más para desbloquear esta placa.`,
          actionTab: 'pipeline',
          progress: totalTasks / 5,
        });
      }
      if (!unlockedBadges.has('promesa_cumplida') && completedTasks > 0 && completedTasks < 10) {
        const missing = 10 - completedTasks;
        nudges.push({
          id: 'badge-promesa-cumplida',
          category: 'gamification',
          title: 'Cerca de "Promesa Cumplida"',
          body: `Completa ${missing} entrega${missing > 1 ? 's' : ''} más para desbloquear esta placa.`,
          actionTab: 'pipeline',
          progress: completedTasks / 10,
        });
      }
      if (!unlockedBadges.has('negocio_en_marcha') && paidTasks > 0 && paidTasks < 5) {
        const missing = 5 - paidTasks;
        nudges.push({
          id: 'badge-negocio-en-marcha',
          category: 'gamification',
          title: 'Cerca de "Negocio en Marcha"',
          body: `Cobra ${missing} entrega${missing > 1 ? 's' : ''} más para desbloquear esta placa.`,
          actionTab: 'pipeline',
          progress: paidTasks / 5,
        });
      }

      // Add top 2 gamification nudges sorted by proximity to goal
      nudges.sort((a, b) => b.progress - a.progress);
      for (const { progress: _p, ...nudge } of nudges.slice(0, 2)) {
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

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
