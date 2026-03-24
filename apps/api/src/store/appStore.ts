import { randomUUID } from 'crypto';
import {
  createDefaultMediaKitProfile,
  createEmptySocialProfiles,
  getPartnerLookupKey,
} from '@shared';
import type {
  AppState,
  Contact,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DashboardSummaryResponse,
  DeleteEntityResponse,
  Goal,
  GoalPriority,
  GoalStatus,
  MediaKitMetric,
  MediaKitOffer,
  Partner,
  SettingsResponse,
  Task,
  Template,
  UpdateContactRequest,
  UpdatePartnerRequest,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateTaskRequest,
} from '@shared';

const SOCIAL_PROFILE_KEYS = ['instagram', 'tiktok', 'x', 'threads', 'youtube'] as const;

const initialState: AppState = {
  tasks: [
    {
      id: '1',
      title: 'Reel de Lanzamiento',
      description: 'Video 60s para TikTok e IG',
      partnerId: 'p1',
      status: 'En Progreso',
      dueDate: '2026-03-22',
      value: 1500,
    },
    {
      id: '2',
      title: 'Mención en YouTube',
      description: 'Integración de 30s',
      partnerId: 'p2',
      status: 'Pendiente',
      dueDate: '2026-04-05',
      value: 2000,
    },
    {
      id: '3',
      title: 'Post Carrusel',
      description: 'Fotos de producto',
      partnerId: 'p1',
      status: 'En Revisión',
      dueDate: '2026-03-20',
      value: 800,
    },
  ],
  partners: [
    {
      id: 'p1',
      name: 'TechBrand',
      status: 'Activo',
      partnershipType: 'Permanente',
      keyTerms: '4 Historias/mes, 1 Reel',
      startDate: '2025-10-01',
      endDate: '2026-07-15',
      monthlyRevenue: 1200,
      annualRevenue: 14400,
      mainChannel: 'Instagram/TikTok',
      contacts: [
        {
          id: 'c1',
          name: 'Laura Gómez',
          role: 'PR Manager',
          email: 'laura@techbrand.com',
          ig: '@laurapr',
          phone: '',
        },
      ],
    },
    {
      id: 'p2',
      name: 'FitLife',
      status: 'En Negociación',
      contacts: [],
    },
  ],
  profile: {
    name: 'Maggie Dayz',
    avatar: '/IMG_3522.JPG',
    handle: '@maggiedayz',
    socialProfiles: {
      ...createEmptySocialProfiles(),
      instagram: '@maggiedayz',
      tiktok: '@maggiedayz',
      x: '@maggiedayz',
    },
    mediaKit: createDefaultMediaKitProfile(),
    goals: [
      {
        id: 'g1',
        area: 'Influencer / Contenido',
        generalGoal: 'Aumentar y fidelizar la audiencia en plataformas clave',
        successMetric: 'Número de Seguidores',
        specificTarget: '300K',
        timeframe: 'Anual',
        status: 'En Curso',
        priority: 'Alta',
        revenueEstimation: 14400,
      },
      {
        id: 'g2',
        area: 'Radio La Mega 107',
        generalGoal: 'Consolidar el programa y asegurar patrocinio de valor',
        successMetric: 'Puntos de Rating (Share)',
        specificTarget: '+1.5 puntos',
        timeframe: 'T3 2026',
        status: 'Pendiente',
        priority: 'Alta',
        revenueEstimation: 2400,
      },
      {
        id: 'g3',
        area: 'Copywriter (Agencia)',
        generalGoal: 'Alcanzar seniority y aumentar los ingresos freelance',
        successMetric: 'Cuentas Lideradas / Ingresos',
        specificTarget: '1 Cuenta Senior',
        timeframe: 'Anual',
        status: 'En Curso',
        priority: 'Alta',
        revenueEstimation: 5400,
      },
      {
        id: 'g4',
        area: 'Host de Eventos',
        generalGoal: 'Expandir la presencia a eventos de alto perfil',
        successMetric: 'Tarifa Mínima de Contratación',
        specificTarget: '3,000 USD',
        timeframe: 'Anual',
        status: 'Pendiente',
        priority: 'Media',
        revenueEstimation: 30000,
      },
      {
        id: 'g5',
        area: 'Afiliados / Blog',
        generalGoal: 'Establecer ingresos pasivos mediante códigos de afiliados',
        successMetric: 'Ventas generadas',
        specificTarget: '50 ventas/mes',
        timeframe: 'Anual',
        status: 'En Curso',
        priority: 'Baja',
        revenueEstimation: 6000,
      }
    ],
    notificationsEnabled: false,
  },
  accentColor: '#C96F5B',
  theme: 'light',
  templates: [
    {
      id: 't1',
      name: '1. Primer contacto (Outreach)',
      subject: 'Propuesta de colaboración - {{brandName}} x {{creatorName}}',
      body: 'Hola {{contactName}},\n\nHe estado siguiendo el trabajo de {{brandName}} y me encanta su enfoque. Mi audiencia conecta muchísimo con su sector y creo que haríamos un gran equipo.\n\nTe dejo mi Media Kit interactivo para que conozcas más de mi perfil y métricas:\n{{mediaKitLink}}\n\n¿Tienen disponibilidad para una breve llamada la próxima semana y explorar ideas?\n\nSaludos,\n{{creatorName}}',
    },
    {
      id: 't2',
      name: '2. Seguimiento (Follow-up)',
      subject: 'Re: Propuesta de colaboración - {{brandName}} x {{creatorName}}',
      body: 'Hola {{contactName}},\n\nTe escribo rápidamente para hacer seguimiento a mi correo anterior. Entiendo que deben estar a tope, pero me encantaría saber si pudieron revisar mi perfil.\n\nSigo a su disposición si quieren agendar una llamada rápida.\n\nAbrazo,\n{{creatorName}}',
    },
    {
      id: 't3',
      name: '3. Envío de entregable',
      subject: 'Contenido listo para revisión - {{brandName}}',
      body: 'Hola {{contactName}},\n\n¡Espero que estés genial!\n\nTe comparto el enlace con el contenido de la campaña listo para su revisión. Quedo atento a tus comentarios para aplicar ajustes si es necesario o proceder con la publicación.\n\n¡Gracias!\n{{creatorName}}',
    },
    {
      id: 't4',
      name: '4. Recordatorio de pago',
      subject: 'Recordatorio: Factura pendiente - {{brandName}}',
      body: 'Hola {{contactName}},\n\nEspero que todo vaya de maravilla.\n\nTe escribo para dejarte un amable recordatorio sobre la factura correspondiente a nuestra última colaboración. Si necesitas que adjunte nuevamente el documento o los datos bancarios, házmelo saber.\n\nQuedo atento a cualquier novedad.\n\nUn saludo,\n{{creatorName}}',
    },
  ],
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

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

function normalizeEmail(email: string | undefined) {
  const normalized = normalizeRequiredText(email, 'El email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('El email no es valido.');
  }

  return normalized.toLowerCase();
}

function normalizeAccentColor(color: string | undefined) {
  const normalized = normalizeRequiredText(color, 'El color');
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

function findPartnerByName(partners: Partner[], name: string) {
  const lookupKey = getPartnerLookupKey(name);

  if (!lookupKey) {
    return undefined;
  }

  return partners.find((partner) => getPartnerLookupKey(partner.name) === lookupKey);
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

class InMemoryAppStore {
  private state: AppState = clone(initialState);

  getSnapshot(): AppState {
    return clone(this.state);
  }

  getDashboardSummary(): DashboardSummaryResponse {
    const today = new Date().toISOString().split('T')[0];

    return {
      activePipelineValue: this.state.tasks
        .filter((task) => task.status !== 'Cobrado')
        .reduce((sum, task) => sum + task.value, 0),
      tasksToday: this.state.tasks.filter((task) => task.dueDate === today).length,
      upcomingTasks: clone(
        [...this.state.tasks]
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 4),
      ),
    };
  }

  listTasks(): Task[] {
    return clone(this.state.tasks);
  }

  createTask(input: CreateTaskRequest): Task {
    const task: Task = {
      id: randomUUID(),
      title: normalizeRequiredText(input.title, 'El titulo'),
      description: normalizeRequiredText(input.description, 'La descripcion'),
      partnerId: normalizeRequiredText(input.partnerId, 'La marca'),
      status: normalizeRequiredText(input.status, 'El estado') as Task['status'],
      dueDate: normalizeDate(input.dueDate),
      value: normalizeMoney(input.value),
      gcalEventId: normalizeOptionalText(input.gcalEventId),
    };

    const partnerExists = this.state.partners.some((partner) => partner.id === task.partnerId);
    if (!partnerExists) {
      throw new Error('La marca seleccionada no existe.');
    }

    this.state.tasks.push(task);
    return clone(task);
  }

  deleteTask(taskId: string): DeleteEntityResponse {
    const originalLength = this.state.tasks.length;
    this.state.tasks = this.state.tasks.filter((task) => task.id !== taskId);
    return { success: this.state.tasks.length !== originalLength };
  }

  updateTask(taskId: string, updates: UpdateTaskRequest): Task | null {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) {
      return null;
    }

    const normalizedUpdates: UpdateTaskRequest = {};

    if (updates.title !== undefined) {
      normalizedUpdates.title = normalizeRequiredText(updates.title, 'El titulo');
    }

    if (updates.description !== undefined) {
      normalizedUpdates.description = normalizeRequiredText(updates.description, 'La descripcion');
    }

    if (updates.partnerId !== undefined) {
      normalizedUpdates.partnerId = normalizeRequiredText(updates.partnerId, 'La marca');
      const partnerExists = this.state.partners.some(
        (partner) => partner.id === normalizedUpdates.partnerId,
      );
      if (!partnerExists) {
        throw new Error('La marca seleccionada no existe.');
      }
    }

    if (updates.status !== undefined) {
      normalizedUpdates.status = normalizeRequiredText(updates.status, 'El estado') as Task['status'];
    }

    if (updates.dueDate !== undefined) {
      normalizedUpdates.dueDate = normalizeDate(updates.dueDate);
    }

    if (updates.value !== undefined) {
      normalizedUpdates.value = normalizeMoney(updates.value);
    }

    if (updates.gcalEventId !== undefined) {
      normalizedUpdates.gcalEventId = normalizeOptionalText(updates.gcalEventId);
    }

    Object.assign(task, normalizedUpdates);
    return clone(task);
  }

  listPartners(): Partner[] {
    return clone(this.state.partners);
  }

  createPartner(input: CreatePartnerRequest): Partner {
    const normalizedName = normalizePartnerName(input.name, 'El nombre de la marca');
    const existingPartner = findPartnerByName(this.state.partners, normalizedName);

    if (existingPartner) {
      return clone(existingPartner);
    }

    const partner: Partner = {
      id: randomUUID(),
      name: normalizedName,
      status: normalizeRequiredText(input.status, 'El estado') as Partner['status'],
      logo: normalizeOptionalText(input.logo),
      contacts: [],
      partnershipType: (normalizeOptionalText((input as any).partnershipType) as any) || 'Por definir',
      keyTerms: normalizeText((input as any).keyTerms),
      startDate: normalizeOptionalText((input as any).startDate),
      endDate: normalizeOptionalText((input as any).endDate),
      monthlyRevenue: Number((input as any).monthlyRevenue) || 0,
      annualRevenue: Number((input as any).annualRevenue) || 0,
      mainChannel: normalizeText((input as any).mainChannel),
    };

    this.state.partners.push(partner);
    return clone(partner);
  }

  updatePartner(partnerId: string, updates: UpdatePartnerRequest): Partner | null {
    const partner = this.state.partners.find((item) => item.id === partnerId);
    if (!partner) {
      return null;
    }

    const normalizedUpdates: UpdatePartnerRequest = {};

    if (updates.name !== undefined) {
      normalizedUpdates.name = normalizePartnerName(updates.name, 'El nombre de la marca');
      const existingPartner = findPartnerByName(this.state.partners, normalizedUpdates.name);

      if (existingPartner && existingPartner.id !== partnerId) {
        throw new Error('Ya existe una marca con ese nombre.');
      }
    }

    if (updates.status !== undefined) {
      normalizedUpdates.status = normalizeRequiredText(updates.status, 'El estado') as Partner['status'];
    }

    if (updates.logo !== undefined) {
      normalizedUpdates.logo = normalizeOptionalText(updates.logo);
    }

    if ((updates as any).partnershipType !== undefined) {
      (normalizedUpdates as any).partnershipType = normalizeText((updates as any).partnershipType);
    }

    if ((updates as any).keyTerms !== undefined) {
      (normalizedUpdates as any).keyTerms = normalizeText((updates as any).keyTerms);
    }

    if ((updates as any).startDate !== undefined) {
      (normalizedUpdates as any).startDate = normalizeOptionalText((updates as any).startDate);
    }

    if ((updates as any).endDate !== undefined) {
      (normalizedUpdates as any).endDate = normalizeOptionalText((updates as any).endDate);
    }

    if ((updates as any).monthlyRevenue !== undefined) {
      (normalizedUpdates as any).monthlyRevenue = Number((updates as any).monthlyRevenue) || 0;
    }

    if ((updates as any).annualRevenue !== undefined) {
      (normalizedUpdates as any).annualRevenue = Number((updates as any).annualRevenue) || 0;
    }

    if ((updates as any).mainChannel !== undefined) {
      (normalizedUpdates as any).mainChannel = normalizeText((updates as any).mainChannel);
    }

    Object.assign(partner, normalizedUpdates);
    return clone(partner);
  }

  addContact(partnerId: string, input: CreateContactRequest): Contact | null {
    const partner = this.state.partners.find((item) => item.id === partnerId);
    if (!partner) {
      return null;
    }

    const igHandle = normalizeOptionalText(input.ig);
    const contact: Contact = {
      id: randomUUID(),
      name: normalizeRequiredText(input.name, 'El nombre del contacto'),
      role: normalizeRequiredText(input.role, 'El rol del contacto'),
      email: normalizeEmail(input.email),
      ig: igHandle ? (igHandle.startsWith('@') ? igHandle : `@${igHandle}`) : '',
      phone: normalizeOptionalText((input as any).phone) || '',
    };
    partner.contacts.push(contact);
    return clone(contact);
  }

  updateContact(contactId: string, updates: UpdateContactRequest): Contact | null {
    for (const partner of this.state.partners) {
      const contact = partner.contacts.find((item) => item.id === contactId);
      if (contact) {
        const normalizedUpdates: UpdateContactRequest = {};

        if (updates.name !== undefined) {
          normalizedUpdates.name = normalizeRequiredText(updates.name, 'El nombre del contacto');
        }

        if (updates.role !== undefined) {
          normalizedUpdates.role = normalizeRequiredText(updates.role, 'El rol del contacto');
        }

        if (updates.email !== undefined) {
          normalizedUpdates.email = normalizeEmail(updates.email);
        }

        if (updates.ig !== undefined) {
          const igHandle = normalizeOptionalText(updates.ig);
          normalizedUpdates.ig = igHandle
            ? igHandle.startsWith('@')
              ? igHandle
              : `@${igHandle}`
            : '';
        }

        if ((updates as any).phone !== undefined) {
          const phoneVal = normalizeOptionalText((updates as any).phone);
          (normalizedUpdates as any).phone = phoneVal || '';
        }

        Object.assign(contact, normalizedUpdates);
        return clone(contact);
      }
    }

    return null;
  }

  deleteContact(contactId: string): DeleteEntityResponse {
    for (const partner of this.state.partners) {
      const originalLength = partner.contacts.length;
      partner.contacts = partner.contacts.filter((contact) => contact.id !== contactId);
      if (partner.contacts.length !== originalLength) {
        return { success: true };
      }
    }

    return { success: false };
  }

  getProfile() {
    return clone(this.state.profile);
  }

  updateProfile(updates: UpdateProfileRequest) {
    const normalizedUpdates: Partial<AppState['profile']> = {};
    const currentSocialProfiles = {
      ...createEmptySocialProfiles(),
      ...(this.state.profile.socialProfiles ?? {}),
    };
    const currentMediaKit = normalizeMediaKitProfile(
      this.state.profile.mediaKit,
      createDefaultMediaKitProfile(),
    );

    if (updates.name !== undefined) {
      normalizedUpdates.name = normalizeRequiredText(updates.name, 'El nombre');
    }

    if (updates.avatar !== undefined) {
      normalizedUpdates.avatar = normalizeRequiredText(updates.avatar, 'El avatar');
    }

    if (updates.handle !== undefined) {
      const handle = normalizeRequiredText(updates.handle, 'El handle');
      normalizedUpdates.handle = handle.startsWith('@') ? handle : `@${handle}`;
    }

    if (updates.socialProfiles !== undefined) {
      normalizedUpdates.socialProfiles = SOCIAL_PROFILE_KEYS.reduce(
        (accumulator, key) => {
          if (updates.socialProfiles?.[key] !== undefined) {
            accumulator[key] = normalizeOptionalText(updates.socialProfiles[key]) || '';
          } else {
            accumulator[key] = currentSocialProfiles[key];
          }

          return accumulator;
        },
        { ...currentSocialProfiles },
      );
    }

    if (updates.mediaKit !== undefined) {
      normalizedUpdates.mediaKit = normalizeMediaKitProfile(
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
    }

    if (updates.goals !== undefined) {
      if (!Array.isArray(updates.goals)) {
        throw new Error('Los objetivos deben ser un array.');
      }

      normalizedUpdates.goals = updates.goals.map((goal: any) => ({
        id: normalizeText(goal.id) || randomUUID(),
        area: normalizeText(goal.area),
        generalGoal: normalizeText(goal.generalGoal),
        successMetric: normalizeText(goal.successMetric),
        specificTarget: normalizeText(goal.specificTarget),
        timeframe: normalizeText(goal.timeframe),
        status: (normalizeText(goal.status) as GoalStatus) || 'Pendiente',
        priority: (normalizeText(goal.priority) as GoalPriority) || 'Media',
        revenueEstimation: Number(goal.revenueEstimation) || 0,
      }));
    }

    if (updates.notificationsEnabled !== undefined) {
      normalizedUpdates.notificationsEnabled = Boolean(updates.notificationsEnabled);
    }

    this.state.profile = {
      ...this.state.profile,
      socialProfiles: currentSocialProfiles,
      mediaKit: currentMediaKit,
      ...normalizedUpdates,
    };

    return clone(this.state.profile);
  }

  getSettings(): SettingsResponse {
    return {
      accentColor: this.state.accentColor,
      theme: this.state.theme,
    };
  }

  updateSettings(updates: UpdateSettingsRequest): SettingsResponse {
    if (updates.accentColor) {
      this.state.accentColor = normalizeAccentColor(updates.accentColor);
    }

    if (updates.theme) {
      if (updates.theme !== 'light' && updates.theme !== 'dark') {
        throw new Error('El tema no es valido.');
      }

      this.state.theme = updates.theme;
    }

    return this.getSettings();
  }

  listTemplates(): Template[] {
    return clone(this.state.templates);
  }

  createTemplate(input: CreateTemplateRequest): Template {
    const template: Template = {
      id: randomUUID(),
      name: normalizeRequiredText(input.name, 'El nombre de la plantilla'),
      subject: normalizeRequiredText(input.subject, 'El asunto'),
      body: normalizeRequiredText(input.body, 'El cuerpo del mensaje'),
    };

    this.state.templates.push(template);
    return clone(template);
  }

  deleteTemplate(templateId: string): DeleteEntityResponse {
    const originalLength = this.state.templates.length;
    this.state.templates = this.state.templates.filter((template) => template.id !== templateId);
    return { success: this.state.templates.length !== originalLength };
  }
}

export const appStore = new InMemoryAppStore();
