export type TaskStatus = 'Pendiente' | 'En Progreso' | 'En Revisión' | 'Completada' | 'Cobrado';
export type PartnerStatus =
  | 'Prospecto'
  | 'En Negociación'
  | 'Activo'
  | 'Inactivo'
  | 'On Hold'
  | 'Relación Culminada';

export type PartnershipType = 'Permanente' | 'Plazo Fijo' | 'One Time' | 'Por definir';

export type AppTheme = 'light' | 'dark';

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  ig: string;
  phone?: string;
}

export interface Partner {
  id: string;
  name: string;
  status: PartnerStatus;
  logo?: string;
  contacts: Contact[];
  goalId?: string;
  keyTerms?: string;
  partnershipType?: PartnershipType;
  startDate?: string;
  endDate?: string;
  monthlyRevenue?: number;
  annualRevenue?: number;
  mainChannel?: string;
  createdAt: string;
  lastContactedAt?: string;
  source?: string;
}

export function getPartnerLookupKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface Task {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  goalId?: string;
  status: TaskStatus;
  dueDate: string;
  value: number;
  gcalEventId?: string;
  createdAt: string;
  completedAt?: string;
  cobradoAt?: string;
  actualPayment?: number;
}

export interface TaskStatusTransition {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedAt: string;
}

export interface PartnerStatusTransition {
  id: string;
  partnerId: string;
  fromStatus: PartnerStatus | null;
  toStatus: PartnerStatus;
  changedAt: string;
}

export interface Template {
  id: string;
  name: string;
  body: string;
}

export interface SocialProfiles {
  instagram: string;
  tiktok: string;
  x: string;
  threads: string;
  youtube: string;
}

export interface MediaKitMetric {
  label: string;
  value: string;
}

export interface MediaKitOffer {
  title: string;
  price: string;
  description: string;
}

export interface MediaKitProfile {
  periodLabel: string;
  updatedLabel: string;
  tagline: string;
  contactEmail: string;
  featuredImage: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  topicTags: string[];
  insightStats: MediaKitMetric[];
  audienceGender: MediaKitMetric[];
  ageDistribution: MediaKitMetric[];
  topCountries: MediaKitMetric[];
  portfolioImages: string[];
  servicesTitle: string;
  servicesDescription: string;
  offerings: MediaKitOffer[];
  brandsTitle: string;
  trustedBrands: string[];
  closingTitle: string;
  closingDescription: string;
  footerNote: string;
}

export type GoalStatus = 'Pendiente' | 'En Curso' | 'Alcanzado' | 'Cancelado';
export type GoalPriority = 'Baja' | 'Media' | 'Alta';

export interface Goal {
  id: string;
  area: string;
  generalGoal: string;
  successMetric: string;
  timeframe: number; // months (1–36)
  targetDate: string; // ISO date (createdAt + timeframe months)
  createdAt: string; // ISO timestamp, set on first save
  status: GoalStatus;
  priority: GoalPriority;
  revenueEstimation: number;
}

export function createEmptySocialProfiles(): SocialProfiles {
  return {
    instagram: '',
    tiktok: '',
    x: '',
    threads: '',
    youtube: '',
  };
}

export function createDefaultMediaKitProfile(): MediaKitProfile {
  return {
    periodLabel: '',
    updatedLabel: '',
    tagline: '',
    contactEmail: '',
    featuredImage: '',
    aboutTitle: '',
    aboutParagraphs: ['', '', ''],
    topicTags: ['', '', '', ''],
    insightStats: [
      { label: 'Seguidores', value: '' },
      { label: 'Engagement Rate', value: '' },
      { label: 'Alcance ultimo mes', value: '' },
      { label: 'Reproducciones ultimo mes', value: '' },
    ],
    audienceGender: [
      { label: 'Mujeres', value: '' },
      { label: 'Hombres', value: '' },
    ],
    ageDistribution: [
      { label: '25-34', value: '' },
      { label: '18-24', value: '' },
      { label: '35-44', value: '' },
      { label: '45+', value: '' },
    ],
    topCountries: [
      { label: '', value: '' },
      { label: '', value: '' },
      { label: '', value: '' },
      { label: '', value: '' },
      { label: '', value: '' },
      { label: '', value: '' },
    ],
    portfolioImages: Array.from({ length: 7 }, () => ''),
    servicesTitle: '',
    servicesDescription: '',
    offerings: [
      { title: '', price: '', description: '' },
      { title: '', price: '', description: '' },
      { title: '', price: '', description: '' },
      { title: '', price: '', description: '' },
    ],
    brandsTitle: '',
    trustedBrands: Array.from({ length: 10 }, () => ''),
    closingTitle: '',
    closingDescription: '',
    footerNote: '',
  };
}

export interface UserProfile {
  name: string;
  avatar: string;
  handle: string;
  socialProfiles: SocialProfiles;
  mediaKit: MediaKitProfile;
  goals: Goal[];
  notificationsEnabled: boolean;
}

export interface AppState {
  tasks: Task[];
  partners: Partner[];
  profile: UserProfile;
  accentColor: string;
  templates: Template[];
  theme: AppTheme;
}

// ────────────────────────────────────────────────────────────
// Efisystem — gamification types
// ────────────────────────────────────────────────────────────

export type PointEventType =
  | 'config_accent_change'    // every accent change; service awards points only on 2nd
  | 'config_profile_complete'
  | 'config_first_goal'
  | 'network_first_partner'
  | 'network_partner_subsequent'
  | 'network_first_contact'
  | 'network_contact_subsequent'
  | 'pipeline_first_task'
  | 'pipeline_task_moved'
  | 'pipeline_task_completed'
  | 'pipeline_task_paid';

export type BadgeKey =
  | 'perfil_estelar'       // Completaste tu perfil al 100%
  | 'vision_clara'         // Definiste 3 objetivos estratégicos
  | 'circulo_intimo'       // Agregaste 5 socios a tu red
  | 'directorio_dorado'    // 10 Socios y 10 Contactos en tu red
  | 'motor_de_ideas'       // Creaste 5 entregas en tu pipeline
  | 'promesa_cumplida'     // Completaste 10 entregas
  | 'creador_imparable'    // Completaste 25 entregas
  | 'negocio_en_marcha'    // Cobraste 5 entregas
  | 'lluvia_de_billetes';  // Cobraste 20 entregas

export interface EfisystemAward {
  pointsEarned: number;
  newTotal: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: BadgeKey[];
}

export interface EfisystemSnapshot {
  totalPoints: number;
  currentLevel: number;
  unlockedBadges: BadgeKey[];
}
