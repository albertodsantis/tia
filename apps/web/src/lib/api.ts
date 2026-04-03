import type {
  AppBootstrapResponse,
  AppSettingsResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  Contact,
  ContactWithAward,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DeleteAccountResponse,
  DeleteEntityResponse,
  EfisystemSnapshot,
  GoogleAuthUrlResponse,
  LoginRequest,
  MeResponse,
  Partner,
  PartnerWithAward,
  RegisterRequest,
  SettingsResponse,
  StrategicViewResponse,
  Task,
  TaskWithAward,
  Template,
  UpdateContactRequest,
  UpdatePartnerRequest,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateTaskRequest,
  UserProfile,
} from '@shared';

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('efi:unauthorized'));
    }

    let message = 'Request failed';
    let code: string | undefined;

    try {
      const errorBody = await response.json();
      message = errorBody.error || message;
      code = errorBody.code;
    } catch {
      message = response.statusText || message;
    }

    throw new ApiError(message, code);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  me: () => apiRequest<MeResponse>('/api/auth/me'),
  register: (payload: RegisterRequest) =>
    apiRequest<MeResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginRequest) =>
    apiRequest<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  googleLoginUrl: () =>
    apiRequest<GoogleAuthUrlResponse>('/api/auth/google/login-url'),
  deleteAccount: () =>
    apiRequest<DeleteAccountResponse>('/api/auth/account', { method: 'DELETE' }),
  googleSupabase: (accessToken: string) =>
    apiRequest<MeResponse>('/api/auth/google/supabase', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    }),
  changePassword: (payload: ChangePasswordRequest) =>
    apiRequest<ChangePasswordResponse>('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const appApi = {
  getBootstrap: () => apiRequest<AppBootstrapResponse>('/api/v1/bootstrap'),
  getEfisystem: () => apiRequest<EfisystemSnapshot>('/api/v1/efisystem'),
  getStrategicView: () => apiRequest<StrategicViewResponse>('/api/v1/strategic-view'),
  getProfile: () => apiRequest<UserProfile>('/api/v1/profile'),
  updateProfile: (payload: UpdateProfileRequest) =>
    apiRequest<UserProfile & { efisystem?: import('@shared').EfisystemAward }>('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSettings: () => apiRequest<SettingsResponse>('/api/v1/settings'),
  updateSettings: (payload: UpdateSettingsRequest) =>
    apiRequest<AppSettingsResponse & { efisystem?: import('@shared').EfisystemAward }>('/api/v1/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  createTask: (payload: CreateTaskRequest) =>
    apiRequest<TaskWithAward>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteTask: (taskId: string) =>
    apiRequest<DeleteEntityResponse>(`/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    }),
  updateTask: (taskId: string, payload: UpdateTaskRequest) =>
    apiRequest<TaskWithAward>(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  createPartner: (payload: CreatePartnerRequest) =>
    apiRequest<PartnerWithAward>('/api/v1/partners', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePartner: (partnerId: string, payload: UpdatePartnerRequest) =>
    apiRequest<Partner>(`/api/v1/partners/${partnerId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  addContact: (partnerId: string, payload: CreateContactRequest) =>
    apiRequest<ContactWithAward>(`/api/v1/partners/${partnerId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateContact: (contactId: string, payload: UpdateContactRequest) =>
    apiRequest<Contact>(`/api/v1/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteContact: (contactId: string) =>
    apiRequest<DeleteEntityResponse>(`/api/v1/contacts/${contactId}`, {
      method: 'DELETE',
    }),
  createTemplate: (payload: CreateTemplateRequest) =>
    apiRequest<Template>('/api/v1/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteTemplate: (templateId: string) =>
    apiRequest<DeleteEntityResponse>(`/api/v1/templates/${templateId}`, {
      method: 'DELETE',
    }),
  getUploadStatus: () => apiRequest<{ enabled: boolean }>('/api/v1/uploads/status'),
  uploadFile: async (file: File, category: string): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    const res = await fetch('/api/v1/uploads', { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Error al subir archivo' }));
      throw new ApiError(body.error || 'Error al subir archivo');
    }
    return res.json();
  },
  deleteUpload: (path: string) =>
    apiRequest<{ success: boolean }>('/api/v1/uploads', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    }),
};
