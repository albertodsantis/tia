import type {
  AppBootstrapResponse,
  AppSettingsResponse,
  Contact,
  CreateContactRequest,
  CreatePartnerRequest,
  CreateTaskRequest,
  CreateTemplateRequest,
  DeleteEntityResponse,
  GoogleAuthUrlResponse,
  LoginRequest,
  MeResponse,
  Partner,
  SettingsResponse,
  Task,
  Template,
  UpdateContactRequest,
  UpdatePartnerRequest,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateTaskRequest,
  UserProfile,
} from '@shared';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = 'Request failed';

    try {
      const errorBody = await response.json();
      message = errorBody.error || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  me: () => apiRequest<MeResponse>('/api/auth/me'),
  login: (payload: LoginRequest) =>
    apiRequest<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  googleLoginUrl: () =>
    apiRequest<GoogleAuthUrlResponse>('/api/auth/google/login-url'),
};

export const appApi = {
  getBootstrap: () => apiRequest<AppBootstrapResponse>('/api/v1/bootstrap'),
  getProfile: () => apiRequest<UserProfile>('/api/v1/profile'),
  updateProfile: (payload: UpdateProfileRequest) =>
    apiRequest<UserProfile>('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSettings: () => apiRequest<SettingsResponse>('/api/v1/settings'),
  updateSettings: (payload: UpdateSettingsRequest) =>
    apiRequest<AppSettingsResponse>('/api/v1/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  createTask: (payload: CreateTaskRequest) =>
    apiRequest<Task>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteTask: (taskId: string) =>
    apiRequest<DeleteEntityResponse>(`/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    }),
  updateTask: (taskId: string, payload: UpdateTaskRequest) =>
    apiRequest<Task>(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  createPartner: (payload: CreatePartnerRequest) =>
    apiRequest<Partner>('/api/v1/partners', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePartner: (partnerId: string, payload: UpdatePartnerRequest) =>
    apiRequest<Partner>(`/api/v1/partners/${partnerId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  addContact: (partnerId: string, payload: CreateContactRequest) =>
    apiRequest<Contact>(`/api/v1/partners/${partnerId}/contacts`, {
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
};
