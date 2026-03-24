export type TaskStatus = 'Pendiente' | 'En Progreso' | 'En Revisión' | 'Completada' | 'Cobrado';
export type PartnerStatus =
  | 'Prospecto'
  | 'En Negociación'
  | 'Activo'
  | 'Inactivo'
  | 'On Hold'
  | 'Relación Culminada';

export type PartnershipType = 'Permanente' | 'One Time' | 'Por definir';

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
  keyTerms?: string;
  partnershipType?: PartnershipType;
  startDate?: string;
  endDate?: string;
  monthlyRevenue?: number;
  annualRevenue?: number;
  mainChannel?: string;
}

export function getPartnerLookupKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
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
  specificTarget: string;
  timeframe: string;
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
    periodLabel: 'Media Kit - Marzo 2026',
    updatedLabel: 'Marzo 2026',
    tagline: 'Observational Humor | Cultural Insights | Caracas Lifestyle',
    contactEmail: 'mariagabrieladiaz95@gmail.com',
    featuredImage: '/IMG_3522.JPG',
    aboutTitle: 'Hola! Soy Maggie.',
    aboutParagraphs: [
      'Me encanta hacer humor observando con detenimiento la cotidianidad. Mi proceso se basa en encontrar esos pequenos comportamientos y codigos culturales que todos en mi entorno reconocemos, para transformarlos en satiras, analisis y sketches con los que es facil sentirse identificado.',
      'Me gusta que mi contenido este atravesado por la venezolanidad, la caraquenidad y nuestros codigos generacionales. Mi trabajo se enfoca en un entretenimiento organico y altamente compartible, donde las marcas se integran de forma natural en las historias y el lenguaje de mi comunidad.',
      'Cuando no estoy haciendo videos, me encuentras siendo locutora en Bonus Track, en La Mega; haciendo impro; o trabajando con marcas como Creativa.',
    ],
    topicTags: ['LifestyleCaraqueno', 'Humor', 'SatiraCultural', 'Glocalness'],
    insightStats: [
      { label: 'Seguidores', value: '22K' },
      { label: 'Engagement Rate', value: '78.93%' },
      { label: 'Alcance ultimo mes', value: '430K' },
      { label: 'Reproducciones ultimo mes', value: '888K' },
    ],
    audienceGender: [
      { label: 'Mujeres', value: '43%' },
      { label: 'Hombres', value: '57%' },
    ],
    ageDistribution: [
      { label: '25-34', value: '41%' },
      { label: '18-24', value: '6%' },
      { label: '35-44', value: '33%' },
      { label: '45+', value: '19%' },
    ],
    topCountries: [
      { label: 'Venezuela', value: '43%' },
      { label: 'Estados Unidos', value: '15%' },
      { label: 'Espana', value: '13%' },
      { label: 'Chile', value: '5%' },
      { label: 'Argentina', value: '4%' },
      { label: 'Otros', value: '20%' },
    ],
    portfolioImages: Array.from({ length: 7 }, (_, index) => `/portfolio-${index + 1}.jpg`),
    servicesTitle: 'Trabajemos juntos!',
    servicesDescription:
      'Cada marca tiene necesidades diferentes. Elige la opcion que mejor se adapte a las tuyas.',
    offerings: [
      {
        title: 'Instagram Reel o TikTok',
        price: '$550',
        description: 'Video con intencion de shareability y conexion.',
      },
      {
        title: 'Set de Stories',
        price: '$250',
        description: 'Al menos 45 segundos de informacion con storytelling a mi estilo.',
      },
      {
        title: 'Post Espejo en Instagram y TikTok',
        price: '+$275',
        description: 'Mismo video, el doble de exposicion.',
      },
      {
        title: 'Pauta Radial: Bonus Track',
        price: '$400',
        description: 'Mencion + presentacion y despedida en programa de La Mega.',
      },
    ],
    brandsTitle: 'Marcas que confian en mi',
    trustedBrands: [
      'Polar Pilsen',
      'Pan de Tata',
      '7up',
      'Pepsi',
      'Cusica',
      'Tu gruero',
      'Brezza',
      'UCAB Shop',
      'PANA',
      'Ticketplate',
    ],
    closingTitle: "Let's create magic.",
    closingDescription: 'Tienes un proyecto en mente? Hablemos.',
    footerNote: 'Todos los derechos reservados.',
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
