import type {
  AppState,
  AppTheme,
  BadgeKey,
  Contact,
  EfisystemAward,
  EfisystemSnapshot,
  Goal,
  MediaKitProfile,
  Partner,
  PartnerStatus,
  PartnerStatusTransition,
  SocialProfiles,
  Task,
  TaskStatus,
  TaskStatusTransition,
  Template,
  UserProfile,
} from '../domain';

export interface AppBootstrapResponse {
  appState: AppState;
  efisystem: EfisystemSnapshot;
}

// Mutating responses that include gamification award data
export interface TaskWithAward extends Task {
  efisystem?: EfisystemAward;
}
export interface PartnerWithAward extends Partner {
  efisystem?: EfisystemAward;
}
export interface ContactWithAward extends Contact {
  efisystem?: EfisystemAward;
}

// Re-export for convenience
export type { BadgeKey, EfisystemAward, EfisystemSnapshot };

export interface DashboardSummaryResponse {
  activePipelineValue: number;
  tasksToday: number;
  upcomingTasks: Task[];
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  partnerId: string;
  goalId?: string;
  status: TaskStatus;
  dueDate: string;
  value: number;
  gcalEventId?: string;
  actualPayment?: number;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>;

export interface CreatePartnerRequest {
  name: string;
  status: PartnerStatus;
  logo?: string;
  source?: string;
  goalId?: string;
  partnershipType?: string;
  keyTerms?: string;
  startDate?: string;
  endDate?: string;
  monthlyRevenue?: number;
  annualRevenue?: number;
  mainChannel?: string;
}

export type UpdatePartnerRequest = Partial<CreatePartnerRequest>;

export interface CreateContactRequest {
  name: string;
  role: string;
  email: string;
  ig: string;
}

export type UpdateContactRequest = Partial<CreateContactRequest>;

export interface UpdateProfileRequest extends Partial<Omit<UserProfile, 'socialProfiles' | 'mediaKit'>> {
  socialProfiles?: Partial<SocialProfiles>;
  mediaKit?: Partial<MediaKitProfile>;
}

export interface UpdateSettingsRequest {
  accentColor?: string;
  theme?: AppTheme;
}

export interface AppSettingsResponse {
  accentColor: string;
  theme: AppTheme;
}

export interface CreateTemplateRequest {
  name: string;
  body: string;
}

export type UpdateTemplateRequest = Partial<CreateTemplateRequest>;

export interface DeleteEntityResponse {
  success: boolean;
}

export type TasksResponse = Task[];
export type PartnersResponse = Partner[];
export type TemplatesResponse = Template[];
export type ProfileResponse = UserProfile;
export type SettingsResponse = AppSettingsResponse;
export type ContactResponse = Contact;
export type PartnerResponse = Partner;
export type TaskResponse = Task;
export type TemplateResponse = Template;
export type TaskStatusHistoryResponse = TaskStatusTransition[];
export type PartnerStatusHistoryResponse = PartnerStatusTransition[];

export interface GoalAggregation {
  goal: Goal;
  taskCount: number;
  totalValue: number;
  completedTaskCount: number;
  partnerCount: number;
  partners: Array<{ id: string; name: string }>;
}

export interface StrategicViewResponse {
  goals: GoalAggregation[];
  unassigned: {
    taskCount: number;
    totalValue: number;
    partnerCount: number;
  };
}
