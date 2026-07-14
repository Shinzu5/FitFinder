import type { ApiErrorResponse, AuthUser, RegisterPayload } from "@/lib/auth/types";
import type { UserRole } from "@/lib/mock-users";

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await parseJson<T & ApiErrorResponse>(response);
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  email: string;
}

export interface LoginInitResponse {
  success: boolean;
  message: string;
  email: string;
  loginToken: string;
}

export interface VerifyLoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  user: AuthUser;
  role: UserRole;
}

export function apiRegister(payload: RegisterPayload) {
  return request<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiVerifyRegistration(email: string, code: string) {
  return request<{ success: boolean; message: string }>("/api/auth/register/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function apiResendRegistrationCode(email: string) {
  return request<{ success: boolean; message: string }>("/api/auth/register/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function apiLoginInit(payload: { email: string; password: string; rememberMe?: boolean }) {
  return request<LoginInitResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiVerifyLogin(loginToken: string, code: string) {
  return request<VerifyLoginResponse>("/api/auth/login/verify", {
    method: "POST",
    body: JSON.stringify({ loginToken, code }),
  });
}

export function apiResendLoginCode(loginToken: string) {
  return request<{ success: boolean; message: string }>("/api/auth/login/resend", {
    method: "POST",
    body: JSON.stringify({ loginToken }),
  });
}

export const LOGIN_CHALLENGE_STORAGE_KEY = "fitfinder-login-token";
