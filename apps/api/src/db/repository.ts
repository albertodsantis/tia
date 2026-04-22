import { randomUUID } from 'crypto';
import type pg from 'pg';
import {
  createDefaultEfiProfile,
  createEmptySocialProfiles,
  getPartnerLookupKey,
} from '@shared';
import type {
  AppState,
  BadgeKey,
  Contact,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DashboardSummaryResponse,
  DeleteEntityResponse,
  EfiProfile,
  EfisystemSnapshot,
  Goal,
  GoalAggregation,
  GoalPriority,
  GoalStatus,
  Partner,
  PartnerStatusTransition,
  ProfileLink,
  SettingsResponse,
  StrategicViewResponse,
  Task,
  TaskStatusTransition,
  Template,
  UpdateContactRequest,
  UpdatePartnerRequest,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateTaskRequest,
  UserProfile,
} from '@shared';

/* ================================================================
   Validation helpers
   ================================================================ */

const SOCIAL_PROFILE_KEYS = ['instagram', 'tiktok', 'x', 'threads', 'youtube', 'linkedin'] as const;

function normalizeRequiredText(value: string | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${label} es obligatorio.`);
  }
  return normalized;
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() || undefined;
}

function normalizeText(value: string | undefined) {
  return value?.trim() || '';
}

function normalizePartnerName(value: string | undefined, label: string) {
  return normalizeRequiredText(value, label).replace(/\s+/g, ' ');
}

function normalizeDate(value: string | undefined) {
  const normalized = normalizeRequiredText(value, 'La fecha');
  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('La fecha no es valida.');
  }
  return normalized;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const trimmed = value.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    throw new Error('La hora debe tener formato HH:mm.');
  }
  return trimmed;
}

function normalizeMoney(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new Error('El valor debe ser un numero igual o mayor que 0.');
  }
  return value;
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function normalizeEmail(email: string | undefined) {
  const normalized = normalizeRequiredText(email, 'El email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('El email no es valido.');
  }
  return normalized.toLowerCase();
}

const ALLOWED_GRADIENTS = new Set(['instagram', 'dawn']);
const ALLOWED_CONICS = new Set(['tiktok']);
const ALLOWED_RETROS = new Set(['crt']);

function normalizeAccentColor(color: string | undefined) {
  const normalized = normalizeRequiredText(color, 'El color');
  if (normalized.startsWith('gradient:')) {
    const key = normalized.slice('gradient:'.length);
    if (!ALLOWED_GRADIENTS.has(key)) {
      throw new Error('El gradiente no es valido.');
    }
    return normalized;
  }
  if (normalized.startsWith('conic:')) {
    const key = normalized.slice('conic:'.length);
    if (!ALLOWED_CONICS.has(key)) {
      throw new Error('El tema no es valido.');
    }
    return normalized;
  }
  if (normalized.startsWith('retro:')) {
    const key = normalized.slice('retro:'.length);
    if (!ALLOWED_RETROS.has(key)) {
      throw new Error('El tema retro no es valido.');
    }
    return normalized;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    throw new Error('El color debe ser un hex valido.');
  }
  return normalized;
}

function normalizeEfiProfile(
  incoming: Partial<EfiProfile> | undefined,
  current: EfiProfile = createDefaultEfiProfile(),
): EfiProfile {
  return {
    links: Array.isArray(incoming?.links)
      ? incoming.links.map((l: any) => ({
          id: normalizeText(l?.id) || randomUUID(),
          label: normalizeText(l?.label),
          url: normalizeText(l?.url),
        } as ProfileLink))
      : current.links,
    pdf_url: incoming?.pdf_url !== undefined ? (normalizeText(incoming.pdf_url ?? undefined) || null) : current.pdf_url,
    pdf_label: normalizeText(incoming?.pdf_label) || current.pdf_label || 'Ver mi media kit',
  };
}

/* ================================================================
   Row mappers — DB snake_case → API camelCase
   ================================================================ */

function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    partnerId: row.partner_id,
    ...(row.goal_id ? { goalId: row.goal_id } : {}),
    status: row.status,
    dueDate: row.due_date,
    ...(row.start_time ? { startTime: row.start_time } : {}),
    ...(row.end_time ? { endTime: row.end_time } : {}),
    value: Number(row.value),
    ...(row.gcal_event_id ? { gcalEventId: row.gcal_event_id } : {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    ...(row.completed_at ? { completedAt: row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at } : {}),
    ...(row.cobrado_at ? { cobradoAt: row.cobrado_at instanceof Date ? row.cobrado_at.toISOString() : row.cobrado_at } : {}),
    ...(row.actual_payment != null ? { actualPayment: Number(row.actual_payment) } : {}),
    checklistItems: Array.isArray(row.checklist_items) ? row.checklist_items : [],
  };
}

function mapRowToContact(row: any): Contact {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    ig: row.ig,
    phone: row.phone || undefined,
  };
}

function mapRowToPartner(row: any): Partner {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    ...(row.logo ? { logo: row.logo } : {}),
    contacts: [],
    ...(row.goal_id ? { goalId: row.goal_id } : {}),
    partnershipType: row.partnership_type,
    keyTerms: row.key_terms,
    ...(row.start_date ? { startDate: row.start_date } : {}),
    ...(row.end_date ? { endDate: row.end_date } : {}),
    monthlyRevenue: Number(row.monthly_revenue),
    annualRevenue: Number(row.annual_revenue),
    mainChannel: row.main_channel,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    ...(row.last_contacted_at ? { lastContactedAt: row.last_contacted_at instanceof Date ? row.last_contacted_at.toISOString() : row.last_contacted_at } : {}),
    ...(row.source ? { source: row.source } : {}),
  };
}

function mapRowToTaskStatusTransition(row: any): TaskStatusTransition {
  return {
    id: row.id,
    taskId: row.task_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at instanceof Date ? row.changed_at.toISOString() : row.changed_at,
  };
}

function mapRowToPartnerStatusTransition(row: any): PartnerStatusTransition {
  return {
    id: row.id,
    partnerId: row.partner_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at instanceof Date ? row.changed_at.toISOString() : row.changed_at,
  };
}

function mapRowToGoal(row: any): Goal {
  return {
    id: row.id,
    area: row.area,
    generalGoal: row.general_goal,
    successMetric: row.success_metric,
    timeframe: Number(row.timeframe) || 12,
    targetDate: row.target_date ? new Date(row.target_date).toISOString().split('T')[0] : '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    status: row.status,
    priority: row.priority,
    revenueEstimation: Number(row.revenue_estimation),
  };
}

/* ================================================================
   PostgresAppStore — multi-tenant, all queries scoped by userId
   ================================================================ */

export class PostgresAppStore {
  constructor(private pool: pg.Pool) {}

  /* ---------- SNAPSHOT (bootstrap) ---------- */

  async getSnapshot(userId: string): Promise<AppState> {
    const [tasks, partners, profile, settings, templates] = await Promise.all([
      this.listTasks(userId),
      this.listPartners(userId),
      this.getProfile(userId),
      this.getSettings(userId),
      this.listTemplates(userId),
    ]);

    return {
      tasks,
      partners,
      profile,
      accentColor: settings.accentColor,
      templates,
      theme: settings.theme,
      profileAccentColor: settings.profileAccentColor,
      profileForceDark: settings.profileForceDark,
    };
  }

  /* ---------- DASHBOARD ---------- */

  async getDashboardSummary(userId: string): Promise<DashboardSummaryResponse> {
    const today = new Date().toISOString().split('T')[0];

    const [valueResult, todayResult, upcomingResult] = await Promise.all([
      this.pool.query(
        `SELECT COALESCE(SUM(value), 0) AS total FROM tasks WHERE user_id = $1 AND status != 'Cobrado'`,
        [userId],
      ),
      this.pool.query(
        'SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND due_date = $2',
        [userId, today],
      ),
      this.pool.query(
        `SELECT id, title, description, partner_id, goal_id, status, due_date, start_time, end_time, value, gcal_event_id,
                created_at, completed_at, cobrado_at, actual_payment, checklist_items
         FROM tasks WHERE user_id = $1 ORDER BY due_date ASC LIMIT 4`,
        [userId],
      ),
    ]);

    return {
      activePipelineValue: Number(valueResult.rows[0].total),
      tasksToday: Number(todayResult.rows[0].count),
      upcomingTasks: upcomingResult.rows.map(mapRowToTask),
    };
  }

  /* ---------- TASKS ---------- */

  async listTasks(userId: string): Promise<Task[]> {
    const { rows } = await this.pool.query(
      `SELECT id, title, description, partner_id, goal_id, status, due_date, start_time, end_time, value, gcal_event_id,
              created_at, completed_at, cobrado_at, actual_payment, checklist_items
       FROM tasks WHERE user_id = $1 ORDER BY due_date ASC`,
      [userId],
    );
    return rows.map(mapRowToTask);
  }

  async createTask(userId: string, input: CreateTaskRequest): Promise<Task> {
    const id = randomUUID();
    const title = normalizeRequiredText(input.title, 'El titulo');
    const description = normalizeOptionalText(input.description) ?? '';
    const partnerId = normalizeRequiredText(input.partnerId, 'La marca');
    const status = normalizeRequiredText(input.status, 'El estado');
    const dueDate = normalizeDate(input.dueDate);
    const startTime = normalizeTime(input.startTime);
    const endTime = normalizeTime(input.endTime);
    const value = input.value !== undefined ? normalizeMoney(input.value) : 0;
    const gcalEventId = normalizeOptionalText(input.gcalEventId) || null;
    const actualPayment = input.actualPayment !== undefined ? normalizeMoney(input.actualPayment) : null;
    const goalId = normalizeOptionalText(input.goalId) || null;
    const checklistItems = Array.isArray(input.checklistItems) ? input.checklistItems : [];

    const { rows: partnerRows } = await this.pool.query(
      'SELECT 1 FROM partners WHERE id = $1 AND user_id = $2',
      [partnerId, userId],
    );
    if (partnerRows.length === 0) {
      throw new Error('La marca seleccionada no existe.');
    }

    if (goalId) {
      const { rows: goalRows } = await this.pool.query(
        'SELECT 1 FROM goals WHERE id = $1 AND user_id = $2',
        [goalId, userId],
      );
      if (goalRows.length === 0) {
        throw new Error('El objetivo seleccionado no existe.');
      }
    }

    const { rows } = await this.pool.query(
      `INSERT INTO tasks (id, user_id, title, description, partner_id, goal_id, status, due_date, original_due_date, start_time, end_time, value, gcal_event_id, actual_payment, checklist_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14)
       RETURNING created_at`,
      [id, userId, title, description, partnerId, goalId, status, dueDate, startTime, endTime, value, gcalEventId, actualPayment, JSON.stringify(checklistItems)],
    );

    const createdAt = rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : rows[0].created_at;

    await this.pool.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status)
       VALUES ($1, $2, NULL, $3)`,
      [id, userId, status],
    );

    return {
      id,
      title,
      description,
      partnerId,
      ...(goalId ? { goalId } : {}),
      status: status as Task['status'],
      dueDate,
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      value,
      createdAt,
      ...(gcalEventId ? { gcalEventId } : {}),
      ...(actualPayment != null ? { actualPayment } : {}),
      checklistItems,
    };
  }

  async updateTask(userId: string, taskId: string, updates: UpdateTaskRequest): Promise<Task | null> {
    const { rows: existing } = await this.pool.query(
      'SELECT status FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId],
    );
    if (existing.length === 0) return null;

    const previousStatus = existing[0].status;
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(normalizeRequiredText(updates.title, 'El titulo'));
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(normalizeOptionalText(updates.description) ?? '');
    }
    if (updates.partnerId !== undefined) {
      const pid = normalizeRequiredText(updates.partnerId, 'La marca');
      const { rows: pr } = await this.pool.query('SELECT 1 FROM partners WHERE id = $1 AND user_id = $2', [pid, userId]);
      if (pr.length === 0) throw new Error('La marca seleccionada no existe.');
      setClauses.push(`partner_id = $${idx++}`);
      values.push(pid);
    }
    if (updates.status !== undefined) {
      const newStatus = normalizeRequiredText(updates.status, 'El estado');
      setClauses.push(`status = $${idx++}`);
      values.push(newStatus);

      if (newStatus !== previousStatus) {
        if (newStatus === 'Completada') {
          setClauses.push(`completed_at = COALESCE(completed_at, NOW())`);
        }
        if (newStatus === 'Cobrado') {
          setClauses.push(`cobrado_at = COALESCE(cobrado_at, NOW())`);
          setClauses.push(`completed_at = COALESCE(completed_at, NOW())`);
        }
      }
    }
    if (updates.dueDate !== undefined) {
      setClauses.push(`due_date = $${idx++}`);
      values.push(normalizeDate(updates.dueDate));
    }
    if ((updates as any).startTime !== undefined) {
      setClauses.push(`start_time = $${idx++}`);
      values.push(normalizeTime((updates as any).startTime));
    }
    if ((updates as any).endTime !== undefined) {
      setClauses.push(`end_time = $${idx++}`);
      values.push(normalizeTime((updates as any).endTime));
    }
    if (updates.value !== undefined) {
      setClauses.push(`value = $${idx++}`);
      values.push(normalizeMoney(updates.value));
    }
    if (updates.gcalEventId !== undefined) {
      setClauses.push(`gcal_event_id = $${idx++}`);
      values.push(normalizeOptionalText(updates.gcalEventId) || null);
    }
    if (updates.actualPayment !== undefined) {
      setClauses.push(`actual_payment = $${idx++}`);
      values.push(normalizeMoney(updates.actualPayment));
    }
    if ((updates as any).goalId !== undefined) {
      const gid = normalizeOptionalText((updates as any).goalId) || null;
      if (gid) {
        const { rows: gr } = await this.pool.query('SELECT 1 FROM goals WHERE id = $1 AND user_id = $2', [gid, userId]);
        if (gr.length === 0) throw new Error('El objetivo seleccionado no existe.');
      }
      setClauses.push(`goal_id = $${idx++}`);
      values.push(gid);
    }
    if ((updates as any).checklistItems !== undefined) {
      setClauses.push(`checklist_items = $${idx++}`);
      values.push(JSON.stringify((updates as any).checklistItems));
    }

    if (setClauses.length === 0) {
      const { rows } = await this.pool.query(
        `SELECT id, title, description, partner_id, goal_id, status, due_date, start_time, end_time, value, gcal_event_id,
                created_at, completed_at, cobrado_at, actual_payment, checklist_items
         FROM tasks WHERE id = $1 AND user_id = $2`,
        [taskId, userId],
      );
      return mapRowToTask(rows[0]);
    }

    setClauses.push('updated_at = NOW()');
    values.push(taskId);
    values.push(userId);

    const { rows: updated } = await this.pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING
       id, title, description, partner_id, goal_id, status, due_date, start_time, end_time, value, gcal_event_id,
       created_at, completed_at, cobrado_at, actual_payment, checklist_items`,
      values,
    );

    if (updates.status !== undefined && updates.status !== previousStatus) {
      await this.pool.query(
        `INSERT INTO task_status_history (task_id, user_id, from_status, to_status)
         VALUES ($1, $2, $3, $4)`,
        [taskId, userId, previousStatus, updates.status],
      );
    }

    return mapRowToTask(updated[0]);
  }

  async deleteTask(userId: string, taskId: string): Promise<DeleteEntityResponse> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId],
    );
    return { success: (rowCount ?? 0) > 0 };
  }

  /* ---------- PARTNERS ---------- */

  async listPartners(userId: string): Promise<Partner[]> {
    const { rows: partnerRows } = await this.pool.query(
      `SELECT id, name, status, logo, goal_id, partnership_type, key_terms,
              start_date, end_date, monthly_revenue, annual_revenue, main_channel,
              created_at, last_contacted_at, source
       FROM partners WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    );

    if (partnerRows.length === 0) return [];

    const partnerIds = partnerRows.map(r => r.id);
    const { rows: contactRows } = await this.pool.query(
      'SELECT id, partner_id, name, role, email, ig, phone FROM contacts WHERE partner_id = ANY($1) AND user_id = $2 ORDER BY created_at ASC',
      [partnerIds, userId],
    );

    const contactsByPartner = new Map<string, Contact[]>();
    for (const row of contactRows) {
      const list = contactsByPartner.get(row.partner_id) || [];
      list.push(mapRowToContact(row));
      contactsByPartner.set(row.partner_id, list);
    }

    return partnerRows.map(row => ({
      ...mapRowToPartner(row),
      contacts: contactsByPartner.get(row.id) || [],
    }));
  }

  async createPartner(userId: string, input: CreatePartnerRequest): Promise<Partner> {
    const normalizedName = normalizePartnerName(input.name, 'El nombre de la marca');
    const lookupKey = getPartnerLookupKey(normalizedName);

    // Dedup check scoped to user
    const { rows: existing } = await this.pool.query(
      'SELECT 1 FROM partners WHERE name_lookup = $1 AND user_id = $2',
      [lookupKey, userId],
    );

    if (existing.length > 0) {
      const partner = mapRowToPartner(existing[0]);
      const { rows: contactRows } = await this.pool.query(
        'SELECT id, partner_id, name, role, email, ig, phone FROM contacts WHERE partner_id = $1 ORDER BY created_at ASC',
        [partner.id],
      );
      partner.contacts = contactRows.map(mapRowToContact);
      return partner;
    }

    const id = randomUUID();
    const status = normalizeRequiredText(input.status, 'El estado');
    const logo = normalizeOptionalText(input.logo) || null;
    const partnershipType = normalizeOptionalText((input as any).partnershipType) || 'Por definir';
    const keyTerms = normalizeText((input as any).keyTerms);
    const startDate = normalizeOptionalText((input as any).startDate) || null;
    const endDate = normalizeOptionalText((input as any).endDate) || null;
    const monthlyRevenue = Number((input as any).monthlyRevenue) || 0;
    const annualRevenue = Number((input as any).annualRevenue) || 0;
    const mainChannel = normalizeText((input as any).mainChannel);
    const source = normalizeText(input.source);
    const goalId = normalizeOptionalText(input.goalId) || null;

    if (goalId) {
      const { rows: goalRows } = await this.pool.query(
        'SELECT 1 FROM goals WHERE id = $1 AND user_id = $2',
        [goalId, userId],
      );
      if (goalRows.length === 0) {
        throw new Error('El objetivo seleccionado no existe.');
      }
    }

    const { rows } = await this.pool.query(
      `INSERT INTO partners (id, user_id, name, name_lookup, status, logo, partnership_type,
         key_terms, start_date, end_date, monthly_revenue, annual_revenue, main_channel, source, goal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING created_at`,
      [id, userId, normalizedName, lookupKey, status, logo, partnershipType,
       keyTerms, startDate, endDate, monthlyRevenue, annualRevenue, mainChannel, source, goalId],
    );

    const createdAt = rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : rows[0].created_at;

    await this.pool.query(
      `INSERT INTO partner_status_history (partner_id, user_id, from_status, to_status)
       VALUES ($1, $2, NULL, $3)`,
      [id, userId, status],
    );

    return {
      id,
      name: normalizedName,
      status: status as Partner['status'],
      ...(logo ? { logo } : {}),
      contacts: [],
      ...(goalId ? { goalId } : {}),
      partnershipType: partnershipType as any,
      keyTerms,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      monthlyRevenue,
      annualRevenue,
      mainChannel,
      createdAt,
      ...(source ? { source } : {}),
    };
  }

  async updatePartner(userId: string, partnerId: string, updates: UpdatePartnerRequest): Promise<Partner | null> {
    const { rows: existing } = await this.pool.query(
      'SELECT id, status FROM partners WHERE id = $1 AND user_id = $2',
      [partnerId, userId],
    );
    if (existing.length === 0) return null;

    const previousStatus = existing[0].status;
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      const normalizedName = normalizePartnerName(updates.name, 'El nombre de la marca');
      const lookupKey = getPartnerLookupKey(normalizedName);

      const { rows: dupes } = await this.pool.query(
        'SELECT 1 FROM partners WHERE name_lookup = $1 AND id != $2 AND user_id = $3',
        [lookupKey, partnerId, userId],
      );
      if (dupes.length > 0) {
        throw new Error('Ya existe una marca con ese nombre.');
      }

      setClauses.push(`name = $${idx++}`);
      values.push(normalizedName);
      setClauses.push(`name_lookup = $${idx++}`);
      values.push(lookupKey);
    }

    if (updates.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(normalizeRequiredText(updates.status, 'El estado'));
    }
    if (updates.logo !== undefined) {
      setClauses.push(`logo = $${idx++}`);
      values.push(normalizeOptionalText(updates.logo) || null);
    }
    if ((updates as any).partnershipType !== undefined) {
      setClauses.push(`partnership_type = $${idx++}`);
      values.push(normalizeText((updates as any).partnershipType));
    }
    if ((updates as any).keyTerms !== undefined) {
      setClauses.push(`key_terms = $${idx++}`);
      values.push(normalizeText((updates as any).keyTerms));
    }
    if ((updates as any).startDate !== undefined) {
      setClauses.push(`start_date = $${idx++}`);
      values.push(normalizeOptionalText((updates as any).startDate) || null);
    }
    if ((updates as any).endDate !== undefined) {
      setClauses.push(`end_date = $${idx++}`);
      values.push(normalizeOptionalText((updates as any).endDate) || null);
    }
    if ((updates as any).monthlyRevenue !== undefined) {
      setClauses.push(`monthly_revenue = $${idx++}`);
      values.push(Number((updates as any).monthlyRevenue) || 0);
    }
    if ((updates as any).annualRevenue !== undefined) {
      setClauses.push(`annual_revenue = $${idx++}`);
      values.push(Number((updates as any).annualRevenue) || 0);
    }
    if ((updates as any).mainChannel !== undefined) {
      setClauses.push(`main_channel = $${idx++}`);
      values.push(normalizeText((updates as any).mainChannel));
    }
    if ((updates as any).lastContactedAt !== undefined) {
      setClauses.push(`last_contacted_at = $${idx++}`);
      values.push(normalizeOptionalText((updates as any).lastContactedAt) || null);
    }
    if (updates.source !== undefined) {
      setClauses.push(`source = $${idx++}`);
      values.push(normalizeText(updates.source));
    }
    if ((updates as any).goalId !== undefined) {
      const gid = normalizeOptionalText((updates as any).goalId) || null;
      if (gid) {
        const { rows: gr } = await this.pool.query('SELECT 1 FROM goals WHERE id = $1 AND user_id = $2', [gid, userId]);
        if (gr.length === 0) throw new Error('El objetivo seleccionado no existe.');
      }
      setClauses.push(`goal_id = $${idx++}`);
      values.push(gid);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(partnerId);
      values.push(userId);

      await this.pool.query(
        `UPDATE partners SET ${setClauses.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
        values,
      );
    }

    if (updates.status !== undefined && updates.status !== previousStatus) {
      await this.pool.query(
        `INSERT INTO partner_status_history (partner_id, user_id, from_status, to_status)
         VALUES ($1, $2, $3, $4)`,
        [partnerId, userId, previousStatus, updates.status],
      );
    }

    // Re-fetch full partner with contacts
    const { rows: partnerRows } = await this.pool.query(
      `SELECT id, name, status, logo, goal_id, partnership_type, key_terms,
              start_date, end_date, monthly_revenue, annual_revenue, main_channel,
              created_at, last_contacted_at, source
       FROM partners WHERE id = $1 AND user_id = $2`,
      [partnerId, userId],
    );
    const partner = mapRowToPartner(partnerRows[0]);

    const { rows: contactRows } = await this.pool.query(
      'SELECT id, partner_id, name, role, email, ig, phone FROM contacts WHERE partner_id = $1 ORDER BY created_at ASC',
      [partnerId],
    );
    partner.contacts = contactRows.map(mapRowToContact);

    return partner;
  }

  /* ---------- CONTACTS ---------- */

  async addContact(userId: string, partnerId: string, input: CreateContactRequest): Promise<Contact | null> {
    const { rows: partnerCheck } = await this.pool.query(
      'SELECT 1 FROM partners WHERE id = $1 AND user_id = $2',
      [partnerId, userId],
    );
    if (partnerCheck.length === 0) return null;

    const id = randomUUID();
    const name = normalizeRequiredText(input.name, 'El nombre del contacto');
    const role = normalizeRequiredText(input.role, 'El rol del contacto');
    const email = normalizeEmail(input.email);
    const igRaw = normalizeOptionalText(input.ig);
    const ig = igRaw ? (igRaw.startsWith('@') ? igRaw : `@${igRaw}`) : '';
    const phone = normalizeOptionalText((input as any).phone) || '';

    await this.pool.query(
      `INSERT INTO contacts (id, user_id, partner_id, name, role, email, ig, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, userId, partnerId, name, role, email, ig, phone],
    );

    return { id, name, role, email, ig, phone };
  }

  async updateContact(userId: string, contactId: string, updates: UpdateContactRequest): Promise<Contact | null> {
    const { rows: existing } = await this.pool.query(
      'SELECT id, name, role, email, ig, phone FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId],
    );
    if (existing.length === 0) return null;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(normalizeRequiredText(updates.name, 'El nombre del contacto'));
    }
    if (updates.role !== undefined) {
      setClauses.push(`role = $${idx++}`);
      values.push(normalizeRequiredText(updates.role, 'El rol del contacto'));
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${idx++}`);
      values.push(normalizeEmail(updates.email));
    }
    if (updates.ig !== undefined) {
      const igRaw = normalizeOptionalText(updates.ig);
      const ig = igRaw ? (igRaw.startsWith('@') ? igRaw : `@${igRaw}`) : '';
      setClauses.push(`ig = $${idx++}`);
      values.push(ig);
    }
    if ((updates as any).phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      values.push(normalizeOptionalText((updates as any).phone) || '');
    }

    if (setClauses.length === 0) {
      return mapRowToContact(existing[0]);
    }

    setClauses.push('updated_at = NOW()');
    values.push(contactId);
    values.push(userId);

    const { rows: updated } = await this.pool.query(
      `UPDATE contacts SET ${setClauses.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values,
    );

    return mapRowToContact(updated[0]);
  }

  async deleteContact(userId: string, contactId: string): Promise<DeleteEntityResponse> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId],
    );
    return { success: (rowCount ?? 0) > 0 };
  }

  /* ---------- PROFILE ---------- */

  async getProfile(userId: string): Promise<UserProfile> {
    const [profileResult, goalsResult] = await Promise.all([
      this.pool.query(
        `SELECT name, avatar, handle, tagline, social_profiles, efi_profile,
                notifications_enabled, primary_profession, secondary_professions,
                custom_profession
         FROM user_profile WHERE user_id = $1`,
        [userId],
      ),
      this.pool.query(
        `SELECT id, area, general_goal, success_metric, timeframe, target_date,
                created_at, status, priority, revenue_estimation
         FROM goals WHERE user_id = $1 ORDER BY sort_order ASC`,
        [userId],
      ),
    ]);

    const row = profileResult.rows[0];

    if (!row) {
      return {
        name: '',
        avatar: '',
        handle: '',
        tagline: '',
        socialProfiles: createEmptySocialProfiles(),
        efiProfile: createDefaultEfiProfile(),
        goals: [],
        notificationsEnabled: false,
      };
    }

    const socialProfiles = {
      ...createEmptySocialProfiles(),
      ...(row.social_profiles || {}),
    };

    const efiProfile = normalizeEfiProfile(row.efi_profile || {});

    return {
      name: row.name,
      avatar: row.avatar,
      handle: row.handle,
      tagline: row.tagline || '',
      socialProfiles,
      efiProfile,
      goals: goalsResult.rows.map(mapRowToGoal),
      notificationsEnabled: row.notifications_enabled,
      primaryProfession: row.primary_profession ?? undefined,
      secondaryProfessions: row.secondary_professions ?? [],
      customProfession: row.custom_profession ?? undefined,
    };
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfile> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch current state for merge logic
      const { rows: profileRows } = await client.query(
        `SELECT social_profiles, efi_profile FROM user_profile WHERE user_id = $1`,
        [userId],
      );
      const currentRow = profileRows[0];
      const currentSocialProfiles = {
        ...createEmptySocialProfiles(),
        ...(currentRow?.social_profiles || {}),
      };
      const currentEfiProfile = normalizeEfiProfile(currentRow?.efi_profile || {});

      // Build profile update
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${idx++}`);
        values.push(normalizeRequiredText(updates.name, 'El nombre'));
      }
      if (updates.avatar !== undefined) {
        setClauses.push(`avatar = $${idx++}`);
        values.push(normalizeText(updates.avatar));
      }
      if (updates.handle !== undefined) {
        const handle = normalizeRequiredText(updates.handle, 'El handle');
        const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;

        // Check uniqueness (case-insensitive, exclude current user)
        const { rows: existing } = await client.query(
          `SELECT 1 FROM user_profile WHERE LOWER(handle) = LOWER($1) AND user_id <> $2 LIMIT 1`,
          [normalizedHandle, userId],
        );
        if (existing.length > 0) {
          throw new Error('Ese handle ya está en uso.');
        }

        setClauses.push(`handle = $${idx++}`);
        values.push(normalizedHandle);
      }
      if (updates.tagline !== undefined) {
        setClauses.push(`tagline = $${idx++}`);
        values.push(normalizeText(updates.tagline));
      }
      if (updates.notificationsEnabled !== undefined) {
        setClauses.push(`notifications_enabled = $${idx++}`);
        values.push(Boolean(updates.notificationsEnabled));
      }
      if (updates.primaryProfession !== undefined) {
        setClauses.push(`primary_profession = $${idx++}`);
        values.push(updates.primaryProfession);
      }
      if (updates.secondaryProfessions !== undefined) {
        setClauses.push(`secondary_professions = $${idx++}`);
        values.push(JSON.stringify(updates.secondaryProfessions));
      }
      if (updates.customProfession !== undefined) {
        setClauses.push(`custom_profession = $${idx++}`);
        values.push(updates.customProfession || null);
      }

      if (updates.socialProfiles !== undefined) {
        const merged = SOCIAL_PROFILE_KEYS.reduce(
          (acc, key) => {
            if (updates.socialProfiles?.[key] !== undefined) {
              acc[key] = normalizeOptionalText(updates.socialProfiles[key]) || '';
            } else {
              acc[key] = currentSocialProfiles[key];
            }
            return acc;
          },
          { ...currentSocialProfiles },
        );
        setClauses.push(`social_profiles = $${idx++}`);
        values.push(JSON.stringify(merged));
      }

      if (updates.efiProfile !== undefined) {
        const merged = normalizeEfiProfile(
          { ...currentEfiProfile, ...updates.efiProfile },
          currentEfiProfile,
        );
        setClauses.push(`efi_profile = $${idx++}`);
        values.push(JSON.stringify(merged));
      }

      if (setClauses.length > 0) {
        setClauses.push('updated_at = NOW()');
        values.push(userId);
        await client.query(
          `UPDATE user_profile SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
          values,
        );
      }

      // Handle goals replacement
      if (updates.goals !== undefined) {
        if (!Array.isArray(updates.goals)) {
          throw new Error('Los objetivos deben ser un array.');
        }

        const normalizedGoals = updates.goals.map((goal: any, index: number) => {
          const rawId = normalizeText(goal.id);
          // If id is not a valid UUID, generate a new one
          const id = (rawId && isValidUUID(rawId)) ? rawId : randomUUID();

          const timeframeMonths = Math.min(36, Math.max(1, Number(goal.timeframe) || 12));
          const createdAt = goal.createdAt ? new Date(goal.createdAt).toISOString() : new Date().toISOString();
          const targetDate = goal.targetDate
            ? new Date(goal.targetDate).toISOString().split('T')[0]
            : (() => {
                const d = new Date(createdAt);
                d.setMonth(d.getMonth() + timeframeMonths);
                return d.toISOString().split('T')[0];
              })();

          const normalized = {
            id,
            area: normalizeText(goal.area),
            generalGoal: normalizeText(goal.generalGoal),
            successMetric: normalizeText(goal.successMetric),
            timeframe: timeframeMonths,
            targetDate,
            createdAt,
            status: (normalizeText(goal.status) as GoalStatus) || 'Pendiente',
            priority: (normalizeText(goal.priority) as GoalPriority) || 'Media',
            revenueEstimation: Number(goal.revenueEstimation) || 0,
            sortOrder: index,
          };

          // Validate required fields
          if (!normalized.id) throw new Error('Goal id es requerido.');
          if (typeof normalized.status !== 'string' || !['Pendiente', 'En Curso', 'Alcanzado', 'Cancelado'].includes(normalized.status)) {
            throw new Error(`Status inválido: ${normalized.status}`);
          }
          if (typeof normalized.priority !== 'string' || !['Baja', 'Media', 'Alta'].includes(normalized.priority)) {
            throw new Error(`Priority inválido: ${normalized.priority}`);
          }
          if (isNaN(normalized.revenueEstimation)) {
            throw new Error('Revenue estimation debe ser un número.');
          }

          return normalized;
        });

        // Delete goals that are no longer in the payload (preserves FKs on kept goals)
        const incomingIds = normalizedGoals.map((g: { id: string }) => g.id);
        if (incomingIds.length > 0) {
          await client.query(
            `DELETE FROM goals WHERE user_id = $1 AND id != ALL($2::uuid[])`,
            [userId, incomingIds],
          );
        } else {
          await client.query('DELETE FROM goals WHERE user_id = $1', [userId]);
        }

        // Upsert each goal — existing rows keep their PK so FK references survive
        for (const g of normalizedGoals) {
          await client.query(
            `INSERT INTO goals (id, user_id, area, general_goal, success_metric,
               timeframe, target_date, created_at, status, priority, revenue_estimation, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO UPDATE SET
               area = EXCLUDED.area,
               general_goal = EXCLUDED.general_goal,
               success_metric = EXCLUDED.success_metric,
               timeframe = EXCLUDED.timeframe,
               target_date = EXCLUDED.target_date,
               status = EXCLUDED.status,
               priority = EXCLUDED.priority,
               revenue_estimation = EXCLUDED.revenue_estimation,
               sort_order = EXCLUDED.sort_order`,
            [g.id, userId, g.area, g.generalGoal, g.successMetric,
             g.timeframe, g.targetDate, g.createdAt, g.status, g.priority, g.revenueEstimation, g.sortOrder],
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getProfile(userId);
  }

  /* ---------- SETTINGS ---------- */

  async getSettings(userId: string): Promise<SettingsResponse> {
    const { rows } = await this.pool.query(
      'SELECT accent_color, theme, profile_accent_color, profile_force_dark FROM user_settings WHERE user_id = $1',
      [userId],
    );
    if (rows.length === 0) {
      return { accentColor: 'gradient:instagram', theme: 'light', profileAccentColor: 'gradient:instagram', profileForceDark: false };
    }
    return {
      accentColor: rows[0].accent_color,
      theme: rows[0].theme as any,
      profileAccentColor: rows[0].profile_accent_color ?? rows[0].accent_color,
      profileForceDark: rows[0].profile_force_dark ?? false,
    };
  }

  async updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<SettingsResponse> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.accentColor) {
      setClauses.push(`accent_color = $${idx++}`);
      values.push(normalizeAccentColor(updates.accentColor));
    }
    if (updates.theme) {
      if (updates.theme !== 'light' && updates.theme !== 'dark') {
        throw new Error('El tema no es valido.');
      }
      setClauses.push(`theme = $${idx++}`);
      values.push(updates.theme);
    }
    if (updates.profileAccentColor !== undefined) {
      setClauses.push(`profile_accent_color = $${idx++}`);
      values.push(normalizeAccentColor(updates.profileAccentColor));
    }
    if (updates.profileForceDark !== undefined) {
      setClauses.push(`profile_force_dark = $${idx++}`);
      values.push(updates.profileForceDark);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(userId);
      await this.pool.query(
        `UPDATE user_settings SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
        values,
      );
    }

    return this.getSettings(userId);
  }

  /* ---------- TEMPLATES ---------- */

  async listTemplates(userId: string): Promise<Template[]> {
    const { rows } = await this.pool.query(
      'SELECT id, name, body FROM templates WHERE user_id = $1 ORDER BY created_at ASC',
      [userId],
    );
    return rows.map(r => ({ id: r.id, name: r.name, body: r.body }));
  }

  async createTemplate(userId: string, input: CreateTemplateRequest): Promise<Template> {
    const id = randomUUID();
    const name = normalizeRequiredText(input.name, 'El nombre de la plantilla');
    const body = normalizeRequiredText(input.body, 'El cuerpo del mensaje');

    await this.pool.query(
      'INSERT INTO templates (id, user_id, name, body) VALUES ($1,$2,$3,$4)',
      [id, userId, name, body],
    );

    return { id, name, body };
  }

  async deleteTemplate(userId: string, templateId: string): Promise<DeleteEntityResponse> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM templates WHERE id = $1 AND user_id = $2',
      [templateId, userId],
    );
    return { success: (rowCount ?? 0) > 0 };
  }

  /* ---------- STATUS HISTORY ---------- */

  async getTaskStatusHistory(userId: string, taskId: string): Promise<TaskStatusTransition[]> {
    const { rows } = await this.pool.query(
      `SELECT id, task_id, from_status, to_status, changed_at
       FROM task_status_history WHERE task_id = $1 AND user_id = $2 ORDER BY changed_at ASC`,
      [taskId, userId],
    );
    return rows.map(mapRowToTaskStatusTransition);
  }

  async getPartnerStatusHistory(userId: string, partnerId: string): Promise<PartnerStatusTransition[]> {
    const { rows } = await this.pool.query(
      `SELECT id, partner_id, from_status, to_status, changed_at
       FROM partner_status_history WHERE partner_id = $1 AND user_id = $2 ORDER BY changed_at ASC`,
      [partnerId, userId],
    );
    return rows.map(mapRowToPartnerStatusTransition);
  }

  /* ---------- STRATEGIC VIEW ---------- */

  async getStrategicView(userId: string): Promise<StrategicViewResponse> {
    const [goalsResult, taskAggResult, partnerAggResult, unassignedTasksResult, unassignedPartnersResult] = await Promise.all([
      this.pool.query(
        `SELECT id, area, general_goal, success_metric, timeframe, target_date,
                created_at, status, priority, revenue_estimation
         FROM goals WHERE user_id = $1 ORDER BY sort_order ASC`,
        [userId],
      ),
      this.pool.query(
        `SELECT goal_id,
                COUNT(*)::int AS task_count,
                COALESCE(SUM(value), 0) AS total_value,
                COUNT(*) FILTER (WHERE status IN ('Completada', 'Cobrado'))::int AS completed_count
         FROM tasks WHERE user_id = $1 AND goal_id IS NOT NULL
         GROUP BY goal_id`,
        [userId],
      ),
      this.pool.query(
        `SELECT goal_id, COUNT(*)::int AS partner_count,
                json_agg(json_build_object('id', id, 'name', name)) AS partners
         FROM partners WHERE user_id = $1 AND goal_id IS NOT NULL
         GROUP BY goal_id`,
        [userId],
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS task_count, COALESCE(SUM(value), 0) AS total_value
         FROM tasks WHERE user_id = $1 AND goal_id IS NULL`,
        [userId],
      ),
      this.pool.query(
        `SELECT COUNT(DISTINCT id)::int AS partner_count
         FROM partners WHERE user_id = $1 AND goal_id IS NULL`,
        [userId],
      ),
    ]);

    const taskAggByGoal = new Map<string, { taskCount: number; totalValue: number; completedCount: number }>();
    for (const row of taskAggResult.rows) {
      taskAggByGoal.set(row.goal_id, {
        taskCount: row.task_count,
        totalValue: Number(row.total_value),
        completedCount: row.completed_count,
      });
    }

    const partnerAggByGoal = new Map<string, { partnerCount: number; partners: Array<{ id: string; name: string }> }>();
    for (const row of partnerAggResult.rows) {
      partnerAggByGoal.set(row.goal_id, {
        partnerCount: row.partner_count,
        partners: row.partners || [],
      });
    }

    const goals: GoalAggregation[] = goalsResult.rows.map((row: any) => {
      const goal = mapRowToGoal(row);
      const taskAgg = taskAggByGoal.get(goal.id) || { taskCount: 0, totalValue: 0, completedCount: 0 };
      const partnerAgg = partnerAggByGoal.get(goal.id) || { partnerCount: 0, partners: [] };

      return {
        goal,
        taskCount: taskAgg.taskCount,
        totalValue: taskAgg.totalValue,
        completedTaskCount: taskAgg.completedCount,
        partnerCount: partnerAgg.partnerCount,
        partners: partnerAgg.partners,
      };
    });

    return {
      goals,
      unassigned: {
        taskCount: unassignedTasksResult.rows[0].task_count,
        totalValue: Number(unassignedTasksResult.rows[0].total_value),
        partnerCount: unassignedPartnersResult.rows[0].partner_count,
      },
    };
  }

  /* ================================================================
     Efisystem — gamification data access
     ================================================================ */

  async getEfisystemSummary(userId: string): Promise<{ totalPoints: number; currentLevel: number }> {
    const result = await this.pool.query(
      `SELECT total_points, current_level FROM efisystem_summary WHERE user_id = $1`,
      [userId],
    );
    if (result.rows.length === 0) return { totalPoints: 0, currentLevel: 1 };
    return {
      totalPoints: result.rows[0].total_points,
      currentLevel: result.rows[0].current_level,
    };
  }

  async upsertEfisystemSummary(userId: string, totalPoints: number, currentLevel: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO efisystem_summary (user_id, total_points, current_level, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET total_points = $2, current_level = $3, updated_at = NOW()`,
      [userId, totalPoints, currentLevel],
    );
  }

  async insertTransaction(userId: string, eventType: string, points: number, meta: object = {}): Promise<void> {
    await this.pool.query(
      `INSERT INTO efisystem_transactions (user_id, event_type, points, meta)
       VALUES ($1, $2, $3, $4)`,
      [userId, eventType, points, JSON.stringify(meta)],
    );
  }

  async updateLastTransactionPoints(userId: string, eventType: string, points: number): Promise<void> {
    await this.pool.query(
      `UPDATE efisystem_transactions
       SET points = $3
       WHERE id = (
         SELECT id FROM efisystem_transactions
         WHERE user_id = $1 AND event_type = $2
         ORDER BY created_at DESC
         LIMIT 1
       )`,
      [userId, eventType, points],
    );
  }

  async countTodayTransactions(userId: string, eventType: string, timezone?: string): Promise<number> {
    if (timezone) {
      const result = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt
         FROM efisystem_transactions
         WHERE user_id = $1 AND event_type = $2
           AND (created_at AT TIME ZONE $3)::date = (NOW() AT TIME ZONE $3)::date`,
        [userId, eventType, timezone],
      );
      return result.rows[0].cnt;
    }
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM efisystem_transactions
       WHERE user_id = $1 AND event_type = $2
         AND created_at >= CURRENT_DATE`,
      [userId, eventType],
    );
    return result.rows[0].cnt;
  }

  async countAllTransactions(userId: string, eventType: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM efisystem_transactions
       WHERE user_id = $1 AND event_type = $2`,
      [userId, eventType],
    );
    return result.rows[0].cnt;
  }

  async hasTransaction(userId: string, eventType: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM efisystem_transactions
       WHERE user_id = $1 AND event_type = $2
       LIMIT 1`,
      [userId, eventType],
    );
    return result.rows.length > 0;
  }

  async hasTransactionForTask(userId: string, eventType: string, taskId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM efisystem_transactions
       WHERE user_id = $1 AND event_type = $2 AND meta->>'taskId' = $3
       LIMIT 1`,
      [userId, eventType, taskId],
    );
    return result.rows.length > 0;
  }

  async getUnlockedBadges(userId: string): Promise<BadgeKey[]> {
    const result = await this.pool.query(
      `SELECT badge_key FROM efisystem_badges
       WHERE user_id = $1
       ORDER BY unlocked_at ASC`,
      [userId],
    );
    return result.rows.map((r: any) => r.badge_key as BadgeKey);
  }

  async unlockBadge(userId: string, badgeKey: BadgeKey): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO efisystem_badges (user_id, badge_key)
       VALUES ($1, $2)
       ON CONFLICT (user_id, badge_key) DO NOTHING`,
      [userId, badgeKey],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getEfisystemSnapshot(userId: string): Promise<EfisystemSnapshot> {
    const [summary, badges] = await Promise.all([
      this.getEfisystemSummary(userId),
      this.getUnlockedBadges(userId),
    ]);
    return {
      totalPoints: summary.totalPoints,
      currentLevel: summary.currentLevel,
      unlockedBadges: badges,
    };
  }

  async countPartners(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM partners WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  async countContacts(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM contacts WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  async countGoals(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM goals WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  async countTasksCreated(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  async countCompletedTasks(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1 AND status IN ('Completada', 'Cobrado')`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  async countPaidTasks(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1 AND status = 'Cobrado'`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  // ────────────────────────────────────────────────────────────
  // Badge-specific counters (sección 3 — Hábitos)
  // ────────────────────────────────────────────────────────────

  /** Distinct local days on which the user created a task strictly before the given hour (0–23). */
  async countDistinctDaysWithTaskCreatedBeforeHour(userId: string, hour: number, timezone: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(DISTINCT (created_at AT TIME ZONE $2)::date)::int AS cnt
       FROM tasks
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM created_at AT TIME ZONE $2) < $3`,
      [userId, timezone, hour],
    );
    return result.rows[0].cnt;
  }

  /** Distinct local days on which the user created a task at or after the given hour (0–23). */
  async countDistinctDaysWithTaskCreatedAtOrAfterHour(userId: string, hour: number, timezone: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(DISTINCT (created_at AT TIME ZONE $2)::date)::int AS cnt
       FROM tasks
       WHERE user_id = $1
         AND EXTRACT(HOUR FROM created_at AT TIME ZONE $2) >= $3`,
      [userId, timezone, hour],
    );
    return result.rows[0].cnt;
  }

  /** Tasks completed (Completada/Cobrado) whose due_date was never moved from the original. */
  async countTasksCompletedOnOriginalDate(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1
         AND status IN ('Completada', 'Cobrado')
         AND completed_at IS NOT NULL
         AND original_due_date IS NOT NULL
         AND due_date = original_due_date`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  /** Tasks that went from Completada to Cobrado within `maxDays` days. */
  async countTasksPaidWithinDays(userId: string, maxDays: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1
         AND status = 'Cobrado'
         AND completed_at IS NOT NULL
         AND cobrado_at IS NOT NULL
         AND cobrado_at - completed_at <= ($2 || ' days')::interval`,
      [userId, String(maxDays)],
    );
    return result.rows[0].cnt;
  }

  /** Count of goals in 'Alcanzado' status. */
  async countGoalsAchieved(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM goals WHERE user_id = $1 AND status = 'Alcanzado'`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  /** Partners contacted within the last N days. */
  async countActivePartners(userId: string, withinDays: number): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM partners
       WHERE user_id = $1
         AND last_contacted_at IS NOT NULL
         AND last_contacted_at >= NOW() - ($2 || ' days')::interval`,
      [userId, String(withinDays)],
    );
    return result.rows[0].cnt;
  }

  /** True if any local day has ≥ N completed tasks for this user. */
  async hasDayWithNCompletedTasks(userId: string, n: number, timezone: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM tasks
       WHERE user_id = $1
         AND completed_at IS NOT NULL
       GROUP BY (completed_at AT TIME ZONE $2)::date
       HAVING COUNT(*) >= $3
       LIMIT 1`,
      [userId, timezone, n],
    );
    return result.rows.length > 0;
  }

  /** True if any task was paid on a Saturday or Sunday (in the user's timezone). */
  async hasPaidOnWeekend(userId: string, timezone: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM tasks
       WHERE user_id = $1
         AND cobrado_at IS NOT NULL
         AND EXTRACT(DOW FROM cobrado_at AT TIME ZONE $2) IN (0, 6)
       LIMIT 1`,
      [userId, timezone],
    );
    return result.rows.length > 0;
  }

  /**
   * Tasks that were overdue at the end of the given local date — i.e. their due_date was before
   * `cutoffIso` and they weren't completed on or before `cutoffIso`. Used for retroactively
   * assessing whether a past week was "perfect".
   */
  async countTasksOverdueAsOf(userId: string, cutoffIso: string, timezone: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1
         AND due_date IS NOT NULL
         AND due_date < $2
         AND (
           completed_at IS NULL
           OR (completed_at AT TIME ZONE $3)::date > $2::date
         )`,
      [userId, cutoffIso, timezone],
    );
    return result.rows[0].cnt;
  }

  /** Number of tasks overdue today (due_date < today, status Pendiente/En Progreso/En Revision). */
  async countOverdueTasks(userId: string, todayIso: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1
         AND status IN ('Pendiente', 'En Progreso', 'En Revision')
         AND due_date < $2`,
      [userId, todayIso],
    );
    return result.rows[0].cnt;
  }

  /** Active tasks with a due_date (Pendiente/En Progreso/En Revision). Used to gate pipeline_zen so an empty account doesn't earn it. */
  async countActiveTasksWithDueDate(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1
         AND status IN ('Pendiente', 'En Progreso', 'En Revision')
         AND due_date IS NOT NULL`,
      [userId],
    );
    return result.rows[0].cnt;
  }

  /** Number of tasks completed on a specific local date (for weekly perfect-week calc). */
  async countTasksCompletedOnDate(userId: string, dateIso: string, timezone: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE user_id = $1
         AND completed_at IS NOT NULL
         AND (completed_at AT TIME ZONE $3)::date = $2::date`,
      [userId, dateIso, timezone],
    );
    return result.rows[0].cnt;
  }

  // ────────────────────────────────────────────────────────────
  // Streak & pipeline-zen state (sección 4)
  // ────────────────────────────────────────────────────────────

  async getStreakState(userId: string): Promise<{
    currentStreakDays: number;
    longestStreakDays: number;
    lastActiveDate: string | null;
    cleanPipelineDays: number;
    perfectWeeksCount: number;
    perfectWeeksMonthKey: string | null;
  }> {
    const result = await this.pool.query(
      `SELECT current_streak_days, longest_streak_days, last_active_date,
              clean_pipeline_days, perfect_weeks_count, perfect_weeks_month_key
       FROM efisystem_summary WHERE user_id = $1`,
      [userId],
    );
    if (result.rows.length === 0) {
      return {
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActiveDate: null,
        cleanPipelineDays: 0,
        perfectWeeksCount: 0,
        perfectWeeksMonthKey: null,
      };
    }
    const row = result.rows[0];
    const last = row.last_active_date;
    return {
      currentStreakDays: row.current_streak_days ?? 0,
      longestStreakDays: row.longest_streak_days ?? 0,
      lastActiveDate: last instanceof Date ? last.toISOString().slice(0, 10) : (last ?? null),
      cleanPipelineDays: row.clean_pipeline_days ?? 0,
      perfectWeeksCount: row.perfect_weeks_count ?? 0,
      perfectWeeksMonthKey: row.perfect_weeks_month_key ?? null,
    };
  }

  async updateStreakFields(
    userId: string,
    fields: {
      currentStreakDays?: number;
      longestStreakDays?: number;
      lastActiveDate?: string | null;
      cleanPipelineDays?: number;
      perfectWeeksCount?: number;
      perfectWeeksMonthKey?: string | null;
    },
  ): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (fields.currentStreakDays !== undefined)   { sets.push(`current_streak_days = $${idx++}`);   values.push(fields.currentStreakDays); }
    if (fields.longestStreakDays !== undefined)   { sets.push(`longest_streak_days = $${idx++}`);   values.push(fields.longestStreakDays); }
    if (fields.lastActiveDate !== undefined)      { sets.push(`last_active_date = $${idx++}`);      values.push(fields.lastActiveDate); }
    if (fields.cleanPipelineDays !== undefined)   { sets.push(`clean_pipeline_days = $${idx++}`);   values.push(fields.cleanPipelineDays); }
    if (fields.perfectWeeksCount !== undefined)   { sets.push(`perfect_weeks_count = $${idx++}`);   values.push(fields.perfectWeeksCount); }
    if (fields.perfectWeeksMonthKey !== undefined){ sets.push(`perfect_weeks_month_key = $${idx++}`); values.push(fields.perfectWeeksMonthKey); }
    if (sets.length === 0) return;
    values.push(userId);
    // Ensure a row exists so the UPDATE lands somewhere.
    await this.pool.query(
      `INSERT INTO efisystem_summary (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    await this.pool.query(
      `UPDATE efisystem_summary SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = $${idx}`,
      values,
    );
  }
}
