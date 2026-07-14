import type { UserRole } from "@/lib/mock-users";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  emailVerified: boolean;
}

export interface AuthSession {
  user: AuthUser;
  role: UserRole;
  isAuthenticated: boolean;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Exclude<UserRole, "ADMIN" | "CLERK">;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  retryAfterSeconds?: number;
}
