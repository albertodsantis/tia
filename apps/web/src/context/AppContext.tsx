import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createDefaultEfiProfile,
  createEmptySocialProfiles,
  getPartnerLookupKey,
} from '@shared';
import type {
  AppState,
  AppTheme,
  BadgeKey,
  Contact,
  EfisystemAward,
  EfisystemSnapshot,
  Partner,
  Task,
  Template,
  UpdateProfileRequest,
  UserProfile,
} from '@shared';
import { appApi } from '../lib/api';
import { getAccentCssVariables, getGradientCss, getRepresentativeHex, getSurfaceOverrides, isGradientAccent, isRetroAccent } from '../lib/accent';
import { addLocalDays, formatLocalDateISO } from '../lib/date';
import { toast } from '../lib/toast';

// ── Badge display labels ──────────────────────────────────────
const BADGE_LABELS: Record<BadgeKey, string> = {
  perfil_estelar: 'Perfil Público Activado',
  vision_clara: 'Visión Clara',
  circulo_intimo: 'Círculo Íntimo',
  directorio_dorado: 'Directorio Dorado',
  motor_de_ideas: 'Motor de Ideas',
  promesa_cumplida: 'Promesa Cumplida',
  creador_imparable: 'Creador Imparable',
  negocio_en_marcha: 'Negocio en Marcha',
  lluvia_de_billetes: 'Lluvia de Billetes',
};

const emptyEfisystem: EfisystemSnapshot = {
  totalPoints: 0,
  currentLevel: 1,
  unlockedBadges: [],
};

interface AppContextType extends AppState {
  email: string;
  provider: 'email' | 'google';
  onProviderChange: (provider: 'email' | 'google') => void;
  accentHex: string;
  accentGradient: string;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  actionError: string | null;
  efisystem: EfisystemSnapshot;
  onLogout: () => void;
  refreshAppData: () => Promise<void>;
  dismissActionError: () => void;
  reportActionError: (message: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addPartner: (partner: Omit<Partner, 'id' | 'createdAt'>) => Promise<string>;
  findPartnerByName: (name: string) => Partner | undefined;
  ensurePartnerByName: (name: string, status?: Partner['status']) => Promise<Partner>;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => Promise<void>;
  addContact: (partnerId: string, contact: Omit<Contact, 'id'>) => Promise<void>;
  updateContact: (partnerId: string, contactId: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (partnerId: string, contactId: string) => Promise<void>;
  updateProfile: (profile: UpdateProfileRequest) => Promise<UserProfile>;
  setAccentColor: (color: string) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  setProfileAccentColor: (color: string) => Promise<void>;
  setProfileForceDark: (force: boolean) => Promise<void>;
  addTemplate: (template: Omit<Template, 'id'>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
}

const emptyState: AppState = {
  tasks: [],
  partners: [],
  profile: {
    name: '',
    avatar: '',
    handle: '',
    tagline: '',
    socialProfiles: createEmptySocialProfiles(),
    efiProfile: createDefaultEfiProfile(),
    goals: [],
    notificationsEnabled: false,
  },
  accentColor: '#C96F5B',
  theme: 'light',
  templates: [],
  profileAccentColor: '#C96F5B',
  profileForceDark: false,
};

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    tagline: profile.tagline ?? '',
    socialProfiles: {
      ...createEmptySocialProfiles(),
      ...(profile.socialProfiles ?? {}),
    },
    efiProfile: {
      ...createDefaultEfiProfile(),
      ...(profile.efiProfile ?? {}),
    },
  };
}

function normalizeAppState(appState: AppState): AppState {
  return {
    ...appState,
    profile: normalizeProfile(appState.profile),
  };
}

function upsertPartnerInState(partners: Partner[], incomingPartner: Partner) {
  const existingIndex = partners.findIndex((partner) => partner.id === incomingPartner.id);

  if (existingIndex === -1) {
    return [...partners, incomingPartner];
  }

  return partners.map((partner) => (partner.id === incomingPartner.id ? incomingPartner : partner));
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode; onLogout: () => void; email: string; provider: 'email' | 'google'; onProviderChange: (provider: 'email' | 'google') => void }> = ({ children, onLogout, email, provider, onProviderChange }) => {
  const [state, setState] = useState<AppState>(emptyState);
  const [efisystem, setEfisystem] = useState<EfisystemSnapshot>(emptyEfisystem);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Award processing ──────────────────────────────────────────
  const applyAward = (award: EfisystemAward | undefined, toastMsg?: string) => {
    if (!award || award.pointsEarned === 0) return;

    setEfisystem((current) => ({
      totalPoints: award.newTotal,
      currentLevel: award.newLevel,
      unlockedBadges: [
        ...current.unlockedBadges,
        ...award.newBadges.filter((b) => !current.unlockedBadges.includes(b)),
      ],
    }));

    if (award.leveledUp) {
      window.dispatchEvent(new CustomEvent('efi-confetti'));
      toast.success(`¡Subiste al Nivel ${award.newLevel}! ⚡`);
    }

    award.newBadges.forEach((badge) => {
      toast.success(`Logro desbloqueado: ${BADGE_LABELS[badge] ?? badge}`);
    });

    if (toastMsg) {
      toast.success(toastMsg, award.pointsEarned);
    }
  };

  const refreshAppData = async () => {
    setIsBootstrapping(true);
    setBootstrapError(null);

    try {
      const { appState, efisystem: efisystemData } = await appApi.getBootstrap();
      setState(normalizeAppState(appState));
      setEfisystem(efisystemData ?? emptyEfisystem);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar la app.';
      setBootstrapError(message);
      throw error;
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    void refreshAppData();
  }, []);

  useEffect(() => {
    const variables = getAccentCssVariables(state.accentColor);

    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    if (isRetroAccent(state.accentColor)) {
      document.documentElement.setAttribute('data-crt', '');
    } else {
      document.documentElement.removeAttribute('data-crt');
    }

    // Expose accent key as attribute so CSS can target per-theme backgrounds
    if (!state.accentColor.startsWith('#')) {
      document.documentElement.setAttribute('data-accent', state.accentColor);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }

    // Guardamos en caché para que la Landing page pueda leerlo antes de iniciar sesión
    localStorage.setItem('efi_accent_color', state.accentColor);
  }, [state.accentColor]);

  useEffect(() => {
    const overrides = getSurfaceOverrides(state.accentColor, state.theme);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value) {
        document.documentElement.style.setProperty(key, value);
      } else {
        document.documentElement.style.removeProperty(key);
      }
    });
  }, [state.accentColor, state.theme]);

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  useEffect(() => {
    if (state.profile.notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const today = formatLocalDateISO(new Date());
        const tomorrow = formatLocalDateISO(addLocalDays(new Date(), 1));

        const tasksDueToday = state.tasks.filter((task) => task.dueDate === today);
        const tasksDueTomorrow = state.tasks.filter((task) => task.dueDate === tomorrow);

        if (tasksDueToday.length > 0) {
          new Notification('Tareas para hoy', {
            body: `Tienes ${tasksDueToday.length} entregable(s) para hoy.`,
          });
        }

        if (tasksDueTomorrow.length > 0) {
          new Notification('Próximos vencimientos', {
            body: `Tienes ${tasksDueTomorrow.length} entregable(s) para mañana.`,
          });
        }
      }
    }
  }, [state.profile.notificationsEnabled]);

  const dismissActionError = () => {
    setActionError(null);
  };

  const reportActionError = (message: string) => {
    setActionError(message);
  };

  const trackError = (error: unknown): never => {
    const message = error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
    setActionError(message);
    throw error;
  };

  const findPartnerByName = (name: string) => {
    const lookupKey = getPartnerLookupKey(name);

    if (!lookupKey) {
      return undefined;
    }

    return state.partners.find((partner) => getPartnerLookupKey(partner.name) === lookupKey);
  };

  const createOrReusePartner = async ({
    name,
    status,
    logo,
    partnershipType,
    keyTerms,
    startDate,
    endDate,
    monthlyRevenue,
    annualRevenue,
    mainChannel,
  }: {
    name: string;
    status: Partner['status'];
    logo?: string;
    partnershipType?: string;
    keyTerms?: string;
    startDate?: string;
    endDate?: string;
    monthlyRevenue?: number;
    annualRevenue?: number;
    mainChannel?: string;
  }) => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const existingPartner = findPartnerByName(normalizedName);

    if (existingPartner) {
      return existingPartner;
    }

    const res = await appApi.createPartner({
      name: normalizedName,
      status,
      logo,
      partnershipType,
      keyTerms,
      startDate,
      endDate,
      monthlyRevenue,
      annualRevenue,
      mainChannel,
    });

    setState((current) => ({
      ...current,
      partners: upsertPartnerInState(current.partners, res),
    }));

    applyAward(res.efisystem, 'Colaboración agregada');

    return res;
  };

  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    setActionError(null);

    try {
      const res = await appApi.createTask(task);
      setState((current) => ({
        ...current,
        tasks: [...current.tasks, res],
      }));

      applyAward(res.efisystem, 'Entrega creada');

      return res;
    } catch (error) {
      return trackError(error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    setActionError(null);
    const previousTask = state.tasks.find((task) => task.id === taskId);

    try {
      const res = await appApi.updateTask(taskId, { status });

      if (
        previousTask &&
        previousTask.status !== status &&
        state.profile.notificationsEnabled &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('Actualización de Pipeline', {
          body: `La tarea "${previousTask.title}" ha pasado a "${status}".`,
        });
      }

      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? res : task)),
      }));

      // Confetti on Cobrado
      if (status === 'Cobrado' && previousTask?.status !== 'Cobrado') {
        window.dispatchEvent(new CustomEvent('efi-confetti'));
      }

      applyAward(res.efisystem);
    } catch (error) {
      trackError(error);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setActionError(null);

    try {
      const res = await appApi.updateTask(taskId, updates);
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? res : task)),
      }));

      applyAward(res.efisystem);

      return res;
    } catch (error) {
      return trackError(error);
    }
  };

  const deleteTask = async (taskId: string) => {
    setActionError(null);

    try {
      await appApi.deleteTask(taskId);
      setState((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const addPartner = async (partner: Omit<Partner, 'id' | 'createdAt'>) => {
    setActionError(null);

    try {
      const resolvedPartner = await createOrReusePartner({
        name: partner.name,
        status: partner.status,
        logo: partner.logo,
        partnershipType: partner.partnershipType,
        keyTerms: partner.keyTerms,
        startDate: partner.startDate,
        endDate: partner.endDate,
        monthlyRevenue: partner.monthlyRevenue,
        annualRevenue: partner.annualRevenue,
        mainChannel: partner.mainChannel,
      });

      return resolvedPartner.id;
    } catch (error) {
      return trackError(error);
    }
  };

  const ensurePartnerByName = async (name: string, status: Partner['status'] = 'Prospecto') => {
    setActionError(null);

    try {
      return await createOrReusePartner({ name, status });
    } catch (error) {
      return trackError(error);
    }
  };

  const updatePartner = async (partnerId: string, updates: Partial<Partner>) => {
    setActionError(null);

    try {
      const updatedPartner = await appApi.updatePartner(partnerId, {
        name: updates.name,
        status: updates.status,
        logo: updates.logo,
        partnershipType: updates.partnershipType,
        keyTerms: updates.keyTerms,
        startDate: updates.startDate,
        endDate: updates.endDate,
        monthlyRevenue: updates.monthlyRevenue,
        annualRevenue: updates.annualRevenue,
        mainChannel: updates.mainChannel,
      });

      setState((current) => ({
        ...current,
        partners: current.partners.map((partner) =>
          partner.id === partnerId ? updatedPartner : partner,
        ),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const addContact = async (partnerId: string, contact: Omit<Contact, 'id'>) => {
    setActionError(null);

    try {
      const res = await appApi.addContact(partnerId, contact);
      setState((current) => ({
        ...current,
        partners: current.partners.map((partner) =>
          partner.id === partnerId
            ? { ...partner, contacts: [...partner.contacts, res] }
            : partner,
        ),
      }));

      applyAward(res.efisystem);
    } catch (error) {
      trackError(error);
    }
  };

  const updateContact = async (
    partnerId: string,
    contactId: string,
    updates: Partial<Contact>,
  ) => {
    setActionError(null);

    try {
      const updatedContact = await appApi.updateContact(contactId, updates);
      setState((current) => ({
        ...current,
        partners: current.partners.map((partner) =>
          partner.id === partnerId
            ? {
                ...partner,
                contacts: partner.contacts.map((contact) =>
                  contact.id === contactId ? updatedContact : contact,
                ),
              }
            : partner,
        ),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const deleteContact = async (partnerId: string, contactId: string) => {
    setActionError(null);

    try {
      await appApi.deleteContact(contactId);
      setState((current) => ({
        ...current,
        partners: current.partners.map((partner) =>
          partner.id === partnerId
            ? {
                ...partner,
                contacts: partner.contacts.filter((contact) => contact.id !== contactId),
              }
            : partner,
        ),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const updateProfile = async (profile: UpdateProfileRequest): Promise<UserProfile> => {
    setActionError(null);

    try {
      const res = await appApi.updateProfile(profile);
      const normalized = normalizeProfile(res);
      setState((current) => ({
        ...current,
        profile: normalized,
      }));
      applyAward((res as any).efisystem);
      return normalized;
    } catch (error) {
      return trackError(error);
    }
  };

  const setAccentColor = async (color: string) => {
    setActionError(null);

    try {
      const updates: Parameters<typeof appApi.updateSettings>[0] = { accentColor: color };
      if (isRetroAccent(color)) updates.theme = 'dark';
      const res = await appApi.updateSettings(updates);
      setState((current) => ({
        ...current,
        accentColor: res.accentColor,
        theme: res.theme,
      }));
      applyAward((res as any).efisystem);
    } catch (error) {
      trackError(error);
    }
  };

  const setTheme = async (theme: AppTheme) => {
    setActionError(null);

    try {
      const settings = await appApi.updateSettings({ theme });
      setState((current) => ({
        ...current,
        accentColor: settings.accentColor,
        theme: settings.theme,
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const setProfileAccentColor = async (color: string) => {
    setActionError(null);
    // Optimistic update so the preview iframe refreshes immediately
    setState((current) => ({ ...current, profileAccentColor: color }));
    try {
      const settings = await appApi.updateSettings({ profileAccentColor: color });
      setState((current) => ({
        ...current,
        profileAccentColor: settings.profileAccentColor,
        profileForceDark: settings.profileForceDark,
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const setProfileForceDark = async (force: boolean) => {
    setActionError(null);
    setState((current) => ({ ...current, profileForceDark: force }));
    try {
      const settings = await appApi.updateSettings({ profileForceDark: force });
      setState((current) => ({
        ...current,
        profileAccentColor: settings.profileAccentColor,
        profileForceDark: settings.profileForceDark,
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const addTemplate = async (template: Omit<Template, 'id'>) => {
    setActionError(null);

    try {
      const createdTemplate = await appApi.createTemplate(template);
      setState((current) => ({
        ...current,
        templates: [...current.templates, createdTemplate],
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    setActionError(null);

    try {
      await appApi.deleteTemplate(templateId);
      setState((current) => ({
        ...current,
        templates: current.templates.filter((template) => template.id !== templateId),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const accentHex = getRepresentativeHex(state.accentColor);
  const accentGradient = isGradientAccent(state.accentColor)
    ? (getGradientCss(state.accentColor) || accentHex)
    : accentHex;

  return (
    <AppContext.Provider
      value={{
        ...state,
        email,
        provider,
        onProviderChange,
        accentHex,
        accentGradient,
        isBootstrapping,
        bootstrapError,
        actionError,
        efisystem,
        onLogout,
        refreshAppData,
        dismissActionError,
        reportActionError,
        addTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        addPartner,
        findPartnerByName,
        ensurePartnerByName,
        updatePartner,
        addContact,
        updateContact,
        deleteContact,
        updateProfile,
        setAccentColor,
        setTheme,
        setProfileAccentColor,
        setProfileForceDark,
        addTemplate,
        deleteTemplate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
};
