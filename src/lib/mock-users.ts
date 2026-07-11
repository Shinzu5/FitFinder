export type UserRole = "USER" | "OWNER" | "CLERK" | "ADMIN";

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  avatarUrl?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: "admin-1",
    fullName: "Admin User",
    email: "admin@fitfinder.com",
    password: "Password123!",
    role: "ADMIN",
  },
  {
    id: "owner-1",
    fullName: "Owner User",
    email: "owner@fitfinder.com",
    password: "Password123!",
    role: "OWNER",
  },
  {
    id: "clerk-1",
    fullName: "Clerk User",
    email: "clerk@fitfinder.com",
    password: "Password123!",
    role: "CLERK",
  },
  {
    id: "user-1",
    fullName: "Alex Rivera",
    email: "user@fitfinder.com",
    password: "Password123!",
    role: "USER",
  },
];

export const roleToDashboardPath: Record<UserRole, string> = {
  USER: "/dashboard/user",
  OWNER: "/dashboard/owner",
  CLERK: "/dashboard/clerk",
  ADMIN: "/dashboard/admin",
};
