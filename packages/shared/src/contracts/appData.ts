import type {
  AppState,
  AppTheme,
  Contact,
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
}

export interface DashboardSummaryResponse {
  activePipelineValue: number;
  tasksToday: number;
  upcomingTasks: Task[];
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  partnerId: string;
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
