import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createDefaultMediaKitProfile,
  createEmptySocialProfiles,
  getPartnerLookupKey,
} from '@shared';
import type {
  AppState,
  AppTheme,
  Contact,
  Partner,
  Task,
  Template,
  UpdateProfileRequest,
  UserProfile,
} from '@shared';
import { appApi } from '../lib/api';
import { getAccentCssVariables, getRepresentativeHex } from '../lib/accent';
import { addLocalDays, formatLocalDateISO } from '../lib/date';

interface AppContextType extends AppState {
  accentHex: string;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  actionError: string | null;
  onLogout: () => void;
  refreshAppData: () => Promise<void>;
  dismissActionError: () => void;
  reportActionError: (message: string) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addPartner: (partner: Omit<Partner, 'id'>) => Promise<string>;
  findPartnerByName: (name: string) => Partner | undefined;
  ensurePartnerByName: (name: string, status?: Partner['status']) => Promise<Partner>;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => Promise<void>;
  addContact: (partnerId: string, contact: Omit<Contact, 'id'>) => Promise<void>;
  updateContact: (partnerId: string, contactId: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (partnerId: string, contactId: string) => Promise<void>;
  updateProfile: (profile: UpdateProfileRequest) => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
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
    socialProfiles: createEmptySocialProfiles(),
    mediaKit: createDefaultMediaKitProfile(),
    goals: [],
    notificationsEnabled: false,
  },
  accentColor: '#C96F5B',
  theme: 'light',
  templates: [],
};

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    socialProfiles: {
      ...createEmptySocialProfiles(),
      ...(profile.socialProfiles ?? {}),
    },
    mediaKit: {
      ...createDefaultMediaKitProfile(),
      ...(profile.mediaKit ?? {}),
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

export const AppProvider: React.FC<{ children: React.ReactNode; onLogout: () => void }> = ({ children, onLogout }) => {
  const [state, setState] = useState<AppState>(emptyState);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshAppData = async () => {
    setIsBootstrapping(true);
    setBootstrapError(null);

    try {
      const { appState } = await appApi.getBootstrap();
      setState(normalizeAppState(appState));
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

    // Guardamos en caché para que la Landing page pueda leerlo antes de iniciar sesión
    localStorage.setItem('tia_accent_color', state.accentColor);
  }, [state.accentColor]);

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
  }: {
    name: string;
    status: Partner['status'];
    logo?: string;
  }) => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const existingPartner = findPartnerByName(normalizedName);

    if (existingPartner) {
      return existingPartner;
    }

    const createdPartner = await appApi.createPartner({
      name: normalizedName,
      status,
      logo,
    });

    setState((current) => ({
      ...current,
      partners: upsertPartnerInState(current.partners, createdPartner),
    }));

    return createdPartner;
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    setActionError(null);

    try {
      const createdTask = await appApi.createTask(task);
      setState((current) => ({
        ...current,
        tasks: [...current.tasks, createdTask],
      }));

      return createdTask;
    } catch (error) {
      return trackError(error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    setActionError(null);
    const previousTask = state.tasks.find((task) => task.id === taskId);

    try {
      const updatedTask = await appApi.updateTask(taskId, { status });

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
        tasks: current.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setActionError(null);

    try {
      const updatedTask = await appApi.updateTask(taskId, updates);
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
      }));

      return updatedTask;
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

  const addPartner = async (partner: Omit<Partner, 'id'>) => {
    setActionError(null);

    try {
      const resolvedPartner = await createOrReusePartner({
        name: partner.name,
        status: partner.status,
        logo: partner.logo,
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
      const createdContact = await appApi.addContact(partnerId, contact);
      setState((current) => ({
        ...current,
        partners: current.partners.map((partner) =>
          partner.id === partnerId
            ? { ...partner, contacts: [...partner.contacts, createdContact] }
            : partner,
        ),
      }));
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

  const updateProfile = async (profile: UpdateProfileRequest) => {
    setActionError(null);

    try {
      const updatedProfile = await appApi.updateProfile(profile);
      setState((current) => ({
        ...current,
        profile: normalizeProfile(updatedProfile),
      }));
    } catch (error) {
      trackError(error);
    }
  };

  const setAccentColor = async (color: string) => {
    setActionError(null);

    try {
      const settings = await appApi.updateSettings({ accentColor: color });
      setState((current) => ({
        ...current,
        accentColor: settings.accentColor,
        theme: settings.theme,
      }));
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

  return (
    <AppContext.Provider
      value={{
        ...state,
        accentHex,
        isBootstrapping,
        bootstrapError,
        actionError,
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
