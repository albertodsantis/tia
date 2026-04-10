export interface GoogleAuthUrlResponse {
  url: string;
}

export interface AuthStatusResponse {
  connected: boolean;
}

export interface LogoutResponse {
  success: boolean;
}

export interface DeleteAccountResponse {
  success: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: 'email' | 'google';
}

export interface MeResponse {
  user: SessionUser | null;
  isNew?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  updatedProvider: 'email' | 'google';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  currentPassword?: string;
}

export interface SimpleSuccessResponse {
  success: boolean;
}
