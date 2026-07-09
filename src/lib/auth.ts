import { mockUsers, type MockUser, type UserRole } from "@/lib/mock-users";

export interface AuthSession {
  user: MockUser;
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

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getMockSessionFromStorage(storage: Storage | null) {
  if (!storage) return null;
  const raw = storage.getItem("fitfinder-auth");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setMockSessionInStorage(storage: Storage | null, session: AuthSession) {
  if (!storage) return;
  storage.setItem("fitfinder-auth", JSON.stringify(session));
}

export function removeMockSessionFromStorage(storage: Storage | null) {
  if (!storage) return;
  storage.removeItem("fitfinder-auth");
}

export function mockLogin(payload: LoginPayload): AuthSession | null {
  const matchingUser = mockUsers.find(
    (user) => user.email.toLowerCase() === payload.email.toLowerCase() && user.password === payload.password,
  );

  if (!matchingUser) {
    return null;
  }

  return {
    user: matchingUser,
    role: matchingUser.role,
    isAuthenticated: true,
    accessToken: "mock-jwt-token-123456789",
  };
}

export function mockRegister(payload: RegisterPayload): AuthSession | null {
  const existingUser = mockUsers.find((user) => user.email.toLowerCase() === payload.email.toLowerCase());
  if (existingUser) {
    return null;
  }

  const createdUser: MockUser = {
    id: `mock-${Date.now()}`,
    fullName: payload.fullName,
    email: payload.email,
    password: payload.password,
    role: payload.role,
  };

  mockUsers.push(createdUser);

  return {
    user: createdUser,
    role: createdUser.role,
    isAuthenticated: true,
    accessToken: "mock-jwt-token-123456789",
  };
}

export function mockForgotPassword(email: string) {
  return mockUsers.some((user) => user.email.toLowerCase() === email.toLowerCase());
}
