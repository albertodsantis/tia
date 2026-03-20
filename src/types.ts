export type TaskStatus = 'Pendiente' | 'En Progreso' | 'En Revisión' | 'Completada';
export type PartnerStatus = 'Prospecto' | 'En Negociación' | 'Activo' | 'Inactivo' | 'On Hold' | 'Relación Culminada';

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  ig: string;
}

export interface Partner {
  id: string;
  name: string;
  status: PartnerStatus;
  logo?: string;
  contacts: Contact[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  status: TaskStatus;
  dueDate: string;
  value: number;
  gcalEventId?: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  handle: string;
  goals: [string, string, string];
  notificationsEnabled: boolean;
}

export interface AppState {
  tasks: Task[];
  partners: Partner[];
  profile: UserProfile;
  accentColor: string;
  templates: Template[];
  theme: 'light' | 'dark';
}
