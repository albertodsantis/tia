import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import type {
  AppBootstrapResponse,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DashboardSummaryResponse,
  SessionUser,
  SettingsResponse,
  UpdateContactRequest,
  UpdatePartnerRequest,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateTaskRequest,
} from '@shared';
import type { PostgresAppStore } from '../db/repository';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Bad request';
}

/** Require authenticated session — attaches userId to req. */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user: SessionUser | undefined = (req.session as any).user;
  if (!user?.id) {
    return res.status(401).json({ error: 'No autenticado.' });
  }
  (req as any).userId = user.id;
  next();
}

function getUserId(req: Request): string {
  return (req as any).userId;
}

export function createV1Router(appStore: PostgresAppStore, _pool: pg.Pool) {
  const router = Router();

  // All v1 routes require authentication
  router.use(requireAuth);

  router.get('/bootstrap', async (req, res) => {
    try {
      const userId = getUserId(req);
      const response: AppBootstrapResponse = {
        appState: await appStore.getSnapshot(userId),
      };
      res.json(response);
    } catch (error) {
      console.error('Bootstrap error:', error);
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
      const task = await appStore.createTask(getUserId(req), req.body as CreateTaskRequest);
      res.status(201).json(task);
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
      const task = await appStore.updateTask(getUserId(req), req.params.taskId, req.body as UpdateTaskRequest);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
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
      const partner = await appStore.createPartner(getUserId(req), req.body as CreatePartnerRequest);
      res.status(201).json(partner);
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
      const contact = await appStore.addContact(
        getUserId(req),
        req.params.partnerId,
        req.body as CreateContactRequest,
      );
      if (!contact) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.status(201).json(contact);
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
      const profile = await appStore.updateProfile(getUserId(req), req.body as UpdateProfileRequest);
      res.json(profile);
    } catch (error) {
      res.status(400).json({ error: getErrorMessage(error) });
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
      const response = await appStore.updateSettings(getUserId(req), req.body as UpdateSettingsRequest);
      res.json(response);
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

  return router;
}
