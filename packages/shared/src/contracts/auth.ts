export interface GoogleAuthUrlResponse {
  url: string;
}

export interface AuthStatusResponse {
  connected: boolean;
}

export interface LogoutResponse {
  success: boolean;
}

export interface LoginRequest {
  email: string;
  name: string;
}

export interface SessionUser {
  email: string;
  name: string;
  avatar: string;
  provider: 'email' | 'google';
}

export interface MeResponse {
  user: SessionUser | null;
}
