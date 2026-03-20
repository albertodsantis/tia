import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Task, Partner, UserProfile, Template, Contact } from '../types';

interface AppContextType extends AppState {
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addPartner: (partner: Omit<Partner, 'id'>) => string;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => void;
  addContact: (partnerId: string, contact: Omit<Contact, 'id'>) => void;
  updateContact: (partnerId: string, contactId: string, updates: Partial<Contact>) => void;
  deleteContact: (partnerId: string, contactId: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setAccentColor: (color: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addTemplate: (template: Omit<Template, 'id'>) => void;
  updateTemplate: (templateId: string, updates: Partial<Template>) => void;
  deleteTemplate: (templateId: string) => void;
}

const defaultState: AppState = {
  tasks: [
    { id: '1', title: 'Reel de Lanzamiento', description: 'Video 60s para TikTok e IG', partnerId: 'p1', status: 'En Progreso', dueDate: '2026-03-22', value: 1500 },
    { id: '2', title: 'Mención en YouTube', description: 'Integración de 30s', partnerId: 'p2', status: 'Pendiente', dueDate: '2026-04-05', value: 2000 },
    { id: '3', title: 'Post Carrusel', description: 'Fotos de producto', partnerId: 'p1', status: 'En Revisión', dueDate: '2026-03-20', value: 800 },
  ],
  partners: [
    { id: 'p1', name: 'TechBrand', status: 'Activo', contacts: [{ id: 'c1', name: 'Laura Gómez', role: 'PR Manager', email: 'laura@techbrand.com', ig: '@laurapr' }] },
    { id: 'p2', name: 'FitLife', status: 'En Negociación', contacts: [] },
  ],
  profile: {
    name: 'Alex Creator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    handle: '@alexcreator',
    goals: ['Llegar a 1M en TikTok', 'Cerrar 5 contratos a largo plazo', 'Lanzar mi propio merch'],
    notificationsEnabled: false,
  },
  accentColor: '#8b5cf6', // Violet
  theme: 'light',
  templates: [
    {
      id: 't1',
      name: 'Primer Contacto',
      subject: 'Oportunidad de Colaboración - {{brandName}} x {{creatorName}}',
      body: 'Hola {{contactName}},\n\nMe encanta lo que están haciendo en {{brandName}}. Me gustaría explorar una colaboración para mi audiencia.\n\nSaludos,\n{{creatorName}}'
    }
  ]
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', state.accentColor);
  }, [state.accentColor]);

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // Notifications logic
  useEffect(() => {
    if (state.profile.notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const today = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        const tasksDueToday = state.tasks.filter(t => t.dueDate === today);
        const tasksDueTomorrow = state.tasks.filter(t => t.dueDate === tomorrow);

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

  const addTask = (task: Omit<Task, 'id'>) => {
    const newTask = { ...task, id: crypto.randomUUID() };
    setState(s => ({ ...s, tasks: [...s.tasks, newTask] }));
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setState(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (task && task.status !== status && s.profile.notificationsEnabled && Notification.permission === 'granted') {
        new Notification('Actualización de Pipeline', {
          body: `La tarea "${task.title}" ha pasado a "${status}".`,
        });
      }
      return {
        ...s,
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, status } : t)
      };
    });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setState(s => ({
      ...s,
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    }));
  };

  const addPartner = (partner: Omit<Partner, 'id'>) => {
    const newPartner = { ...partner, id: crypto.randomUUID() };
    setState(s => ({ ...s, partners: [...s.partners, newPartner] }));
    return newPartner.id;
  };

  const updatePartner = (partnerId: string, updates: Partial<Partner>) => {
    setState(s => ({
      ...s,
      partners: s.partners.map(p => p.id === partnerId ? { ...p, ...updates } : p)
    }));
  };

  const addContact = (partnerId: string, contact: Omit<Contact, 'id'>) => {
    const newContact = { ...contact, id: crypto.randomUUID() };
    setState(s => ({
      ...s,
      partners: s.partners.map(p => 
        p.id === partnerId 
          ? { ...p, contacts: [...p.contacts, newContact] }
          : p
      )
    }));
  };

  const updateContact = (partnerId: string, contactId: string, updates: Partial<Contact>) => {
    setState(s => ({
      ...s,
      partners: s.partners.map(p => 
        p.id === partnerId 
          ? { ...p, contacts: p.contacts.map(c => c.id === contactId ? { ...c, ...updates } : c) }
          : p
      )
    }));
  };

  const deleteContact = (partnerId: string, contactId: string) => {
    setState(s => ({
      ...s,
      partners: s.partners.map(p => 
        p.id === partnerId 
          ? { ...p, contacts: p.contacts.filter(c => c.id !== contactId) }
          : p
      )
    }));
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setState(s => ({ ...s, profile: { ...s.profile, ...profile } }));
  };

  const setAccentColor = (color: string) => {
    setState(s => ({ ...s, accentColor: color }));
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setState(s => ({ ...s, theme }));
  };

  const addTemplate = (template: Omit<Template, 'id'>) => {
    const newTemplate = { ...template, id: crypto.randomUUID() };
    setState(s => ({ ...s, templates: [...s.templates, newTemplate] }));
  };

  const updateTemplate = (templateId: string, updates: Partial<Template>) => {
    setState(s => ({
      ...s,
      templates: s.templates.map(t => t.id === templateId ? { ...t, ...updates } : t)
    }));
  };

  const deleteTemplate = (templateId: string) => {
    setState(s => ({
      ...s,
      templates: s.templates.filter(t => t.id !== templateId)
    }));
  };

  return (
    <AppContext.Provider value={{ ...state, addTask, updateTaskStatus, updateTask, addPartner, updatePartner, addContact, updateContact, deleteContact, updateProfile, setAccentColor, setTheme, addTemplate, updateTemplate, deleteTemplate }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
