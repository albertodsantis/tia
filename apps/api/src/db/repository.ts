import { randomUUID } from 'crypto';
import type pg from 'pg';
import {
  createDefaultMediaKitProfile,
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
  EfisystemSnapshot,
  Goal,
  GoalAggregation,
  GoalPriority,
  GoalStatus,
  MediaKitMetric,
  MediaKitOffer,
  Partner,
  PartnerStatusTransition,
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

const SOCIAL_PROFILE_KEYS = ['instagram', 'tiktok', 'x', 'threads', 'youtube'] as const;

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

const ALLOWED_GRADIENTS = new Set(['instagram']);
const ALLOWED_CONICS = new Set(['tiktok']);

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
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    throw new Error('El color debe ser un hex valido.');
  }
  return normalized;
}

function normalizeMetricList(items: MediaKitMetric[] | undefined, fallback: MediaKitMetric[]) {
  return (items ?? fallback).map((item, index) => ({
    label: normalizeText(item?.label) || fallback[index]?.label || '',
    value: normalizeText(item?.value),
  }));
}

function normalizeOfferList(items: MediaKitOffer[] | undefined, fallback: MediaKitOffer[]) {
  return (items ?? fallback).map((item, index) => ({
    title: normalizeText(item?.title) || fallback[index]?.title || '',
    price: normalizeText(item?.price),
    description: normalizeText(item?.description),
  }));
}

function normalizeStringList(values: string[] | undefined, fallback: string[]) {
  return (values ?? fallback).map((value, index) => normalizeText(value) || fallback[index] || '');
}

function normalizeMediaKitProfile(
  mediaKit: Partial<AppState['profile']['mediaKit']> | undefined,
  currentMediaKit = createDefaultMediaKitProfile(),
) {
  const fallback = currentMediaKit;
  return {
    periodLabel: normalizeText(mediaKit?.periodLabel) || fallback.periodLabel,
    updatedLabel: normalizeText(mediaKit?.updatedLabel) || fallback.updatedLabel,
    tagline: normalizeText(mediaKit?.tagline),
    contactEmail: normalizeText(mediaKit?.contactEmail),
    featuredImage: normalizeText(mediaKit?.featuredImage),
    aboutTitle: normalizeText(mediaKit?.aboutTitle) || fallback.aboutTitle,
    aboutParagraphs: normalizeStringList(mediaKit?.aboutParagraphs, fallback.aboutParagraphs),
    topicTags: normalizeStringList(mediaKit?.topicTags, fallback.topicTags),
    insightStats: normalizeMetricList(mediaKit?.insightStats, fallback.insightStats),
    audienceGender: normalizeMetricList(mediaKit?.audienceGender, fallback.audienceGender),
    ageDistribution: normalizeMetricList(mediaKit?.ageDistribution, fallback.ageDistribution),
    topCountries: normalizeMetricList(mediaKit?.topCountries, fallback.topCountries),
    portfolioImages: normalizeStringList(mediaKit?.portfolioImages, fallback.portfolioImages),
    servicesTitle: normalizeText(mediaKit?.servicesTitle) || fallback.servicesTitle,
    servicesDescription: normalizeText(mediaKit?.servicesDescription),
    offerings: normalizeOfferList(mediaKit?.offerings, fallback.offerings),
    brandsTitle: normalizeText(mediaKit?.brandsTitle) || fallback.brandsTitle,
    trustedBrands: normalizeStringList(mediaKit?.trustedBrands, fallback.trustedBrands),
    closingTitle: normalizeText(mediaKit?.closingTitle) || fallback.closingTitle,
    closingDescription: normalizeText(mediaKit?.closingDescription),
    footerNote: normalizeText(mediaKit?.footerNote) || fallback.footerNote,
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
        `SELECT id, title, description, partner_id, goal_id, status, due_date, value, gcal_event_id,
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
      `SELECT id, title, description, partner_id, goal_id, status, due_date, value, gcal_event_id,
              created_at, completed_at, cobrado_at, actual_payment, checklist_items
       FROM tasks WHERE user_id = $1 ORDER BY due_date ASC`,
      [userId],
    );
    return rows.map(mapRowToTask);
  }

  async createTask(userId: string, input: CreateTaskRequest): Promise<Task> {
    const id = randomUUID();
    const title = normalizeRequiredText(input.title, 'El titulo');
    const description = normalizeRequiredText(input.description, 'La descripcion');
    const partnerId = normalizeRequiredText(input.partnerId, 'La marca');
    const status = normalizeRequiredText(input.status, 'El estado');
    const dueDate = normalizeDate(input.dueDate);
    const value = normalizeMoney(input.value);
    const gcalEventId = normalizeOptionalText(input.gcalEventId) || null;
    const actualPayment = input.actualPayment !== undefined ? normalizeMoney(input.actualPayment) : null;
    const goalId = normalizeOptionalText(input.goalId) || null;

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
      `INSERT INTO tasks (id, user_id, title, description, partner_id, goal_id, status, due_date, value, gcal_event_id, actual_payment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING created_at`,
      [id, userId, title, description, partnerId, goalId, status, dueDate, value, gcalEventId, actualPayment],
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
      value,
      createdAt,
      ...(gcalEventId ? { gcalEventId } : {}),
      ...(actualPayment != null ? { actualPayment } : {}),
      checklistItems: [],
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
      values.push(normalizeRequiredText(updates.description, 'La descripcion'));
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
        `SELECT id, title, description, partner_id, goal_id, status, due_date, value, gcal_event_id,
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
       id, title, description, partner_id, goal_id, status, due_date, value, gcal_event_id,
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
      'SELECT * FROM partners WHERE user_id = $1 ORDER BY created_at ASC',
      [userId],
    );

    if (partnerRows.length === 0) return [];

    const partnerIds = partnerRows.map(r => r.id);
    const { rows: contactRows } = await this.pool.query(
      'SELECT * FROM contacts WHERE partner_id = ANY($1) AND user_id = $2 ORDER BY created_at ASC',
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
      'SELECT * FROM partners WHERE name_lookup = $1 AND user_id = $2',
      [lookupKey, userId],
    );

    if (existing.length > 0) {
      const partner = mapRowToPartner(existing[0]);
      const { rows: contactRows } = await this.pool.query(
        'SELECT * FROM contacts WHERE partner_id = $1 ORDER BY created_at ASC',
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
      'SELECT * FROM partners WHERE id = $1 AND user_id = $2',
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
      'SELECT * FROM partners WHERE id = $1 AND user_id = $2',
      [partnerId, userId],
    );
    const partner = mapRowToPartner(partnerRows[0]);

    const { rows: contactRows } = await this.pool.query(
      'SELECT * FROM contacts WHERE partner_id = $1 ORDER BY created_at ASC',
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
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
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
      this.pool.query('SELECT * FROM user_profile WHERE user_id = $1', [userId]),
      this.pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY sort_order ASC', [userId]),
    ]);

    const row = profileResult.rows[0];

    if (!row) {
      return {
        name: '',
        avatar: '',
        handle: '',
        socialProfiles: createEmptySocialProfiles(),
        mediaKit: createDefaultMediaKitProfile(),
        goals: [],
        notificationsEnabled: false,
      };
    }

    const socialProfiles = {
      ...createEmptySocialProfiles(),
      ...(row.social_profiles || {}),
    };

    const mediaKit = {
      ...createDefaultMediaKitProfile(),
      ...(row.media_kit || {}),
    };

    return {
      name: row.name,
      avatar: row.avatar,
      handle: row.handle,
      socialProfiles,
      mediaKit,
      goals: goalsResult.rows.map(mapRowToGoal),
      notificationsEnabled: row.notifications_enabled,
    };
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfile> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch current state for merge logic
      const { rows: profileRows } = await client.query(
        'SELECT * FROM user_profile WHERE user_id = $1',
        [userId],
      );
      const currentRow = profileRows[0];
      const currentSocialProfiles = {
        ...createEmptySocialProfiles(),
        ...(currentRow?.social_profiles || {}),
      };
      const currentMediaKit = normalizeMediaKitProfile(
        currentRow?.media_kit || {},
        createDefaultMediaKitProfile(),
      );

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
        setClauses.push(`handle = $${idx++}`);
        values.push(handle.startsWith('@') ? handle : `@${handle}`);
      }
      if (updates.notificationsEnabled !== undefined) {
        setClauses.push(`notifications_enabled = $${idx++}`);
        values.push(Boolean(updates.notificationsEnabled));
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

      if (updates.mediaKit !== undefined) {
        const mergedMediaKit = normalizeMediaKitProfile(
          {
            ...currentMediaKit,
            ...updates.mediaKit,
            aboutParagraphs: updates.mediaKit.aboutParagraphs ?? currentMediaKit.aboutParagraphs,
            topicTags: updates.mediaKit.topicTags ?? currentMediaKit.topicTags,
            insightStats: updates.mediaKit.insightStats ?? currentMediaKit.insightStats,
            audienceGender: updates.mediaKit.audienceGender ?? currentMediaKit.audienceGender,
            ageDistribution: updates.mediaKit.ageDistribution ?? currentMediaKit.ageDistribution,
            topCountries: updates.mediaKit.topCountries ?? currentMediaKit.topCountries,
            portfolioImages: updates.mediaKit.portfolioImages ?? currentMediaKit.portfolioImages,
            offerings: updates.mediaKit.offerings ?? currentMediaKit.offerings,
            trustedBrands: updates.mediaKit.trustedBrands ?? currentMediaKit.trustedBrands,
          },
          currentMediaKit,
        );
        setClauses.push(`media_kit = $${idx++}`);
        values.push(JSON.stringify(mergedMediaKit));
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

        console.log('[DEBUG] Processing goals update. Count:', updates.goals.length);
        console.log('[DEBUG] Goals payload:', JSON.stringify(updates.goals, null, 2));

        await client.query('DELETE FROM goals WHERE user_id = $1', [userId]);

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
          
          console.log(`[DEBUG] Normalized goal #${index} (ID from ${rawId} converted to ${normalized.id}):`, JSON.stringify(normalized, null, 2));
          return normalized;
        });

        for (const g of normalizedGoals) {
          console.log(`[DEBUG] Inserting goal ${g.id}...`);
          try {
            await client.query(
              `INSERT INTO goals (id, user_id, area, general_goal, success_metric,
                 timeframe, target_date, created_at, status, priority, revenue_estimation, sort_order)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
              [g.id, userId, g.area, g.generalGoal, g.successMetric,
               g.timeframe, g.targetDate, g.createdAt, g.status, g.priority, g.revenueEstimation, g.sortOrder],
            );
            console.log(`[DEBUG] Successfully inserted goal ${g.id}`);
          } catch (insertErr) {
            console.error(`[DEBUG] Failed to insert goal ${g.id}:`, insertErr);
            throw insertErr;
          }
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
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId],
    );
    if (rows.length === 0) {
      return { accentColor: '#C96F5B', theme: 'light' };
    }
    return {
      accentColor: rows[0].accent_color,
      theme: rows[0].theme as any,
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
      'SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at ASC',
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
      this.pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY sort_order ASC', [userId]),
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

  async countTodayTransactions(userId: string, eventType: string): Promise<number> {
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
}
