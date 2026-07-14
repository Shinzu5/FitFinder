import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
} from "@/lib/auth/types";

export type { AuthSession, LoginPayload, RegisterPayload, AuthUser } from "@/lib/auth/types";

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** @deprecated Mock auth is replaced by API-backed authentication. */
export function mockLogin(_payload: LoginPayload): AuthSession | null {
  return null;
}

/** @deprecated Mock auth is replaced by API-backed authentication. */
export function mockRegister(_payload: RegisterPayload): AuthSession | null {
  return null;
}

/** @deprecated */
export function mockForgotPassword(_email: string) {
  return false;
}

/** @deprecated */
export function mockChangePassword(
  _email: string,
  _currentPassword: string,
  _newPassword: string,
): boolean {
  return false;
}
