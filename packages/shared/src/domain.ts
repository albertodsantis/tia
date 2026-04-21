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

export type FreelancerType =
  | 'content_creator'
  | 'podcaster'
  | 'streamer'
  | 'radio'
  | 'photographer'
  | 'copywriter'
  | 'community_manager'
  | 'host_mc'
  | 'speaker'
  | 'dj'
  | 'recruiter'
  | 'coach'
  | 'other';

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

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  goalId?: string;
  status: TaskStatus;
  dueDate: string;
  startTime?: string; // "HH:mm" local time; absent = all-day
  endTime?: string;   // "HH:mm" local time; absent = all-day
  value: number;
  gcalEventId?: string;
  createdAt: string;
  completedAt?: string;
  cobradoAt?: string;
  actualPayment?: number;
  checklistItems: ChecklistItem[];
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
  linkedin: string;
}

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface EfiProfile {
  links: ProfileLink[];
  pdf_url: string | null;
  pdf_label: string;
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
    linkedin: '',
  };
}

export function createDefaultEfiProfile(): EfiProfile {
  return {
    links: [],
    pdf_url: null,
    pdf_label: 'Ver mi media kit',
  };
}

export interface UserProfile {
  name: string;
  avatar: string;
  handle: string;
  tagline: string;
  socialProfiles: SocialProfiles;
  efiProfile: EfiProfile;
  goals: Goal[];
  notificationsEnabled: boolean;
  primaryProfession?: FreelancerType;
  secondaryProfessions?: FreelancerType[];
  customProfession?: string;
}

export interface AppState {
  tasks: Task[];
  partners: Partner[];
  profile: UserProfile;
  accentColor: string;
  templates: Template[];
  theme: AppTheme;
  profileAccentColor: string;
  profileForceDark: boolean;
}

// ────────────────────────────────────────────────────────────
// Notifications
// ────────────────────────────────────────────────────────────

export type AppNotificationCategory = 'agenda' | 'gamification';

export interface AppNotification {
  id: string;
  category: AppNotificationCategory;
  title: string;
  body: string;
  actionTab?: string;
}

// ────────────────────────────────────────────────────────────
// Efisystem — gamification types
// ────────────────────────────────────────────────────────────

export type PointEventType =
  | 'daily_login'                  // once per calendar day on first bootstrap
  | 'daily_activity'               // once per day on first meaningful action; drives streak + pipeline zen + perfect weeks
  | 'config_accent_change'         // every accent change; service awards points only on 2nd
  | 'config_first_accent_change'   // fires once on the 1st accent change; unlocks identidad_propia
  | 'config_profile_complete'
  | 'config_first_goal'
  | 'goal_achieved'                // a strategic goal transitioned to 'Alcanzado'
  | 'network_first_partner'
  | 'network_partner_subsequent'
  | 'network_first_contact'
  | 'network_contact_subsequent'
  | 'pipeline_first_task'
  | 'pipeline_first_checklist_item'
  | 'pipeline_task_moved'
  | 'pipeline_task_completed'
  | 'pipeline_task_paid';

export type BadgeKey =
  // ── Sección 1 — Primeros Pasos ─────────────────────────────
  | 'perfil_estelar'         // EfiLink Activado
  | 'primer_trazo'           // 1ª entrega creada
  | 'red_inicial'            // 1º socio agregado
  | 'rumbo_fijo'             // 1º objetivo definido
  | 'vision_clara'           // 3 objetivos estratégicos
  | 'identidad_propia'       // primer cambio de accent color
  // ── Sección 2 — Hitos de Volumen ───────────────────────────
  | 'motor_de_ideas'         // 5 entregas creadas
  | 'fabrica_de_proyectos'   // 25 entregas creadas
  | 'promesa_cumplida'       // 10 entregas completadas
  | 'creador_imparable'      // 25 entregas completadas
  | 'negocio_en_marcha'      // 5 entregas cobradas
  | 'lluvia_de_billetes'     // 20 entregas cobradas
  | 'circulo_intimo'         // 5 socios en la red
  | 'directorio_dorado'      // 10 socios + 10 contactos
  // ── Sección 3 — Hábitos ────────────────────────────────────
  | 'madrugador'             // 5 días con task creada <8am
  | 'noctambulo'             // 5 días con task creada ≥23hs
  | 'cierre_limpio'          // 5 tasks completadas sin mover la fecha original
  | 'cobrador_implacable'    // 5 tasks cobradas ≤7 días tras completarlas
  | 'pipeline_zen'           // 7 días consecutivos sin tareas vencidas
  | 'visionario_cumplido'    // 3 objetivos en status 'Alcanzado'
  | 'conector'               // 10 socios con lastContactedAt en últimos 30 días
  // ── Sección 4 — Rachas y Constancia ────────────────────────
  | 'en_la_zona'             // racha 3 días
  | 'racha_de_hierro'        // racha 7 días
  | 'inamovible'             // racha 30 días
  | 'semana_perfecta'        // 1 semana con 0 vencidas y ≥3 completadas
  | 'mes_de_oro'             // 4 semanas perfectas en un mismo mes
  // ── Sección 5 — Leyenda ────────────────────────────────────
  | 'fundador'               // etapa beta (primeros 500 por created_at)
  | 'tres_en_un_dia'         // secreta: 3 entregas completadas el mismo día
  | 'cobro_finde'            // secreta: cobrar una entrega en sábado o domingo
  | 'icono_efi';             // 25 placas desbloqueadas

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
