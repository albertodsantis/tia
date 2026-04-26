import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type pg from 'pg';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import type {
  AiChatRequest,
  AiChatResponse,
  AiMessage,
  AiMutation,
  AiQuota,
  AiQuotaResponse,
  PartnerStatus,
  SessionUser,
  TaskStatus,
} from '@shared';
import type { PostgresAppStore } from '../db/repository';
import { logger } from '../lib/logger';

// Quota: monthly window keyed to first day of UTC month.
// Free tier during early access — bumped to 500 at public launch.
const QUOTA_LIMIT = 20;

const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Eres Efi, un asistente integrado en un CRM para freelancers (creadores, podcasters, fotógrafos, copywriters, DJs, coaches…). Ayudas al usuario a gestionar tareas, marcas (partners), contactos, plantillas y su perfil EfiLink.

Reglas:
- Responde siempre en español neutro. Nunca uses voseo ni argentinismos (no "pasate", "tenés", "disfrutá"…).
- Sé concisa, útil y profesional. Sin relleno.
- Antes de crear datos, llama a get_app_data para confirmar que tienes el contexto necesario (ej. para crear una tarea necesitas saber qué partners existen).
- Cuando el usuario pida análisis ("¿qué tareas adelanto?", "¿quién no me responde?"), llama a get_app_data o summarize_pipeline y razona con los datos reales. No inventes.
- Estados de tarea válidos: Pendiente, En Progreso, En Revisión, Completada, Cobrado.
- Estados de partner válidos: Prospecto, En Negociación, Activo, Inactivo, On Hold, Relación Culminada.
- Las fechas van en formato YYYY-MM-DD.`;

function periodStart(date = new Date()): string {
  // First day of UTC month as YYYY-MM-DD.
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function nextPeriodStartIso(date = new Date()): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return next.toISOString();
}

async function readQuota(pool: pg.Pool, userId: string): Promise<AiQuota> {
  const { rows } = await pool.query<{ message_count: number }>(
    'SELECT message_count FROM ai_usage WHERE user_id = $1 AND period_start = $2',
    [userId, periodStart()],
  );
  const used = rows.length > 0 ? Number(rows[0].message_count) : 0;
  return { used, limit: QUOTA_LIMIT, resetsAt: nextPeriodStartIso() };
}

async function bumpQuota(pool: pg.Pool, userId: string): Promise<AiQuota> {
  const { rows } = await pool.query<{ message_count: number }>(
    `INSERT INTO ai_usage (user_id, period_start, message_count, updated_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (user_id, period_start)
     DO UPDATE SET message_count = ai_usage.message_count + 1, updated_at = NOW()
     RETURNING message_count`,
    [userId, periodStart()],
  );
  return { used: Number(rows[0].message_count), limit: QUOTA_LIMIT, resetsAt: nextPeriodStartIso() };
}

function requireAuth(pool: pg.Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user: SessionUser | undefined = (req.session as any).user;
    if (!user?.id) return res.status(401).json({ error: 'No autenticado.' });
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [user.id]);
    if (rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    (req as any).userId = user.id;
    next();
  };
}

const TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: 'get_app_data',
        description: 'Devuelve datos del workspace del usuario. Usa filtros para no traer todo: entity puede ser tasks, partners, templates o profile.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            entity: { type: Type.STRING, description: 'tasks | partners | templates | profile | all' },
            taskStatus: { type: Type.STRING, description: 'Solo si entity=tasks. Filtra por estado.' },
          },
        },
      },
      {
        name: 'summarize_pipeline',
        description: 'Resumen estructurado del pipeline: tareas vencidas, próximas (7 días), sin movimiento (>14 días), totales por estado.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: 'add_task',
        description: 'Crea una tarea. Si no conoces partnerId, llama antes a get_app_data con entity=partners.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            partnerName: { type: Type.STRING, description: 'Nombre exacto del partner. Se resuelve a partnerId.' },
            value: { type: Type.NUMBER },
            dueDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
            status: { type: Type.STRING, description: 'Por defecto Pendiente.' },
          },
          required: ['title', 'partnerName', 'dueDate'],
        },
      },
      {
        name: 'update_task',
        description: 'Actualiza una tarea. Cualquier campo es opcional. Confirma con el usuario antes de cambiar valores monetarios o pasar a Cobrado.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            status: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            value: { type: Type.NUMBER },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'delete_task',
        description: 'Borra una tarea. Pide confirmación al usuario antes de llamar.',
        parameters: {
          type: Type.OBJECT,
          properties: { taskId: { type: Type.STRING } },
          required: ['taskId'],
        },
      },
      {
        name: 'add_partner',
        description: 'Crea un partner (marca/cliente).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            status: { type: Type.STRING, description: 'Por defecto Prospecto.' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_partner',
        description: 'Actualiza un partner. Confirma con el usuario antes de cambiar revenue.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            partnerId: { type: Type.STRING },
            status: { type: Type.STRING },
            partnershipType: { type: Type.STRING },
            keyTerms: { type: Type.STRING },
          },
          required: ['partnerId'],
        },
      },
      {
        name: 'add_contact',
        description: 'Añade un contacto a un partner existente.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            partnerId: { type: Type.STRING },
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            email: { type: Type.STRING },
            ig: { type: Type.STRING, description: 'Usuario de Instagram sin @.' },
          },
          required: ['partnerId', 'name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Actualiza un contacto existente.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            contactId: { type: Type.STRING },
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            email: { type: Type.STRING },
            ig: { type: Type.STRING },
          },
          required: ['contactId'],
        },
      },
      {
        name: 'create_template',
        description: 'Crea una plantilla de mensaje (propuesta, follow-up, etc.). Tú redactas el body en español neutro.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ['name', 'body'],
        },
      },
    ],
  },
];

interface ToolCtx {
  appStore: PostgresAppStore;
  userId: string;
  mutations: AiMutation[];
}

async function runTool(ctx: ToolCtx, name: string, args: Record<string, any>): Promise<unknown> {
  const { appStore, userId, mutations } = ctx;

  switch (name) {
    case 'get_app_data': {
      const entity = args.entity ?? 'all';
      if (entity === 'tasks') {
        const tasks = await appStore.listTasks(userId);
        return args.taskStatus ? tasks.filter((t) => t.status === args.taskStatus) : tasks;
      }
      if (entity === 'partners') return appStore.listPartners(userId);
      if (entity === 'templates') return appStore.listTemplates(userId);
      if (entity === 'profile') return appStore.getSnapshot(userId).then((s) => s.profile);
      return appStore.getSnapshot(userId);
    }

    case 'summarize_pipeline': {
      const tasks = await appStore.listTasks(userId);
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
      const days14ago = new Date(Date.now() - 14 * 86400_000).toISOString();
      const overdue = tasks.filter((t) => t.dueDate < today && t.status !== 'Completada' && t.status !== 'Cobrado');
      const upcoming = tasks.filter((t) => t.dueDate >= today && t.dueDate <= in7);
      const stale = tasks.filter((t) => t.createdAt < days14ago && (t.status === 'Pendiente' || t.status === 'En Progreso'));
      const byStatus: Record<string, number> = {};
      tasks.forEach((t) => { byStatus[t.status] = (byStatus[t.status] ?? 0) + 1; });
      return {
        overdue: overdue.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, value: t.value })),
        upcoming: upcoming.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, value: t.value })),
        stale: stale.map((t) => ({ id: t.id, title: t.title, status: t.status, createdAt: t.createdAt })),
        countsByStatus: byStatus,
      };
    }

    case 'add_task': {
      const partners = await appStore.listPartners(userId);
      const target = partners.find((p) => p.name.toLowerCase() === String(args.partnerName ?? '').toLowerCase());
      if (!target) return { error: `No existe el partner "${args.partnerName}". Crea el partner primero o consulta los partners disponibles.` };
      const task = await appStore.createTask(userId, {
        title: args.title,
        description: args.description ?? '',
        partnerId: target.id,
        status: (args.status as TaskStatus) ?? 'Pendiente',
        dueDate: args.dueDate,
        value: typeof args.value === 'number' ? args.value : 0,
        checklistItems: [],
      });
      mutations.push({ kind: 'task.created', summary: `Tarea creada: ${task.title}` });
      return { id: task.id, title: task.title, dueDate: task.dueDate };
    }

    case 'update_task': {
      const updates: Record<string, any> = {};
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.status !== undefined) updates.status = args.status;
      if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
      if (args.value !== undefined) updates.value = args.value;
      const task = await appStore.updateTask(userId, args.taskId, updates);
      if (!task) return { error: 'Tarea no encontrada.' };
      mutations.push({ kind: 'task.updated', summary: `Tarea actualizada: ${task.title}` });
      return { id: task.id, status: task.status };
    }

    case 'delete_task': {
      const result = await appStore.deleteTask(userId, args.taskId);
      if (!result.success) return { error: 'Tarea no encontrada.' };
      mutations.push({ kind: 'task.deleted', summary: 'Tarea eliminada' });
      return { success: true };
    }

    case 'add_partner': {
      const partner = await appStore.createPartner(userId, {
        name: args.name,
        status: (args.status as PartnerStatus) ?? 'Prospecto',
      });
      mutations.push({ kind: 'partner.created', summary: `Partner creado: ${partner.name}` });
      return { id: partner.id, name: partner.name };
    }

    case 'update_partner': {
      const updates: Record<string, any> = {};
      if (args.status !== undefined) updates.status = args.status;
      if (args.partnershipType !== undefined) updates.partnershipType = args.partnershipType;
      if (args.keyTerms !== undefined) updates.keyTerms = args.keyTerms;
      const partner = await appStore.updatePartner(userId, args.partnerId, updates);
      if (!partner) return { error: 'Partner no encontrado.' };
      mutations.push({ kind: 'partner.updated', summary: `Partner actualizado: ${partner.name}` });
      return { id: partner.id, name: partner.name };
    }

    case 'add_contact': {
      const contact = await appStore.addContact(userId, args.partnerId, {
        name: args.name,
        role: args.role ?? '',
        email: args.email ?? '',
        ig: args.ig ?? '',
      });
      if (!contact) return { error: 'Partner no encontrado.' };
      mutations.push({ kind: 'contact.created', summary: `Contacto añadido: ${contact.name}` });
      return { id: contact.id, name: contact.name };
    }

    case 'update_contact': {
      const updates: Record<string, any> = {};
      if (args.name !== undefined) updates.name = args.name;
      if (args.role !== undefined) updates.role = args.role;
      if (args.email !== undefined) updates.email = args.email;
      if (args.ig !== undefined) updates.ig = args.ig;
      const contact = await appStore.updateContact(userId, args.contactId, updates);
      if (!contact) return { error: 'Contacto no encontrado.' };
      mutations.push({ kind: 'contact.updated', summary: `Contacto actualizado: ${contact.name}` });
      return { id: contact.id, name: contact.name };
    }

    case 'create_template': {
      const template = await appStore.createTemplate(userId, { name: args.name, body: args.body });
      mutations.push({ kind: 'template.created', summary: `Plantilla creada: ${template.name}` });
      return { id: template.id, name: template.name };
    }

    default:
      return { error: `Tool desconocida: ${name}` };
  }
}

export function createAiRouter(appStore: PostgresAppStore, pool: pg.Pool, geminiApiKey: string | undefined) {
  const router = Router();
  router.use(requireAuth(pool));

  const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

  router.get('/quota', async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: 'Asistente no configurado.', code: 'ai_disabled' });
    }
    try {
      const quota = await readQuota(pool, (req as any).userId);
      const response: AiQuotaResponse = quota;
      res.json(response);
    } catch (error) {
      logger.error({ err: error }, 'AI quota read failed');
      res.status(500).json({ error: 'Error al leer cuota.' });
    }
  });

  router.post('/chat', async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: 'Asistente no configurado.', code: 'ai_disabled' });
    }

    const userId = (req as any).userId as string;
    const body = req.body as AiChatRequest;
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: 'messages requerido.' });
    }

    const current = await readQuota(pool, userId);
    if (current.used >= current.limit) {
      return res.status(429).json({
        error: 'Has alcanzado el límite mensual de mensajes con Efi IA.',
        code: 'quota_exhausted',
        quota: current,
      });
    }

    try {
      const history = body.messages.slice(0, -1).map((m: AiMessage) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      const lastUser = body.messages[body.messages.length - 1];

      const chat = ai.chats.create({
        model: MODEL_NAME,
        history,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: TOOLS },
      });

      const ctx: ToolCtx = { appStore, userId, mutations: [] };
      let response = await chat.sendMessage({ message: lastUser.text });
      let safety = 0;

      while (response.functionCalls && response.functionCalls.length > 0) {
        if (++safety > 8) {
          logger.warn({ userId }, 'AI tool loop exceeded 8 hops');
          break;
        }
        const toolResponses: any[] = [];
        for (const call of response.functionCalls) {
          const result = await runTool(ctx, call.name as string, (call.args ?? {}) as Record<string, any>);
          toolResponses.push({
            functionResponse: { name: call.name, response: { result } },
          });
        }
        response = await chat.sendMessage({ message: toolResponses as any });
      }

      const quota = await bumpQuota(pool, userId);
      const payload: AiChatResponse = {
        reply: response.text || '',
        mutations: ctx.mutations,
        quota,
      };
      res.json(payload);
    } catch (error) {
      logger.error({ err: error, userId }, 'AI chat failed');
      res.status(502).json({ error: 'Error al contactar al asistente.', code: 'upstream_error' });
    }
  });

  return router;
}
