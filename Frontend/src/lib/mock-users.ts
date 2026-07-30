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
    fullName: "Admin Super",
    email: "admin@test.com",
    password: "1234678",
    role: "ADMIN",
  },
  {
    id: "owner-1",
    fullName: "Gym Owner",
    email: "owner@test.com",
    password: "1234678",
    role: "OWNER",
  },
  {
    id: "clerk-1",
    fullName: "Ana Reyes",
    email: "clerk@test.com",
    password: "1234678",
    role: "CLERK",
  },
  {
    id: "user-1",
    fullName: "Gymer User",
    email: "gymer@test.com",
    password: "1234678",
    role: "USER",
  },
];

export const roleToDashboardPath: Record<UserRole, string> = {
  USER: "/dashboard/user",
  OWNER: "/dashboard/owner",
  CLERK: "/dashboard/clerk",
  ADMIN: "/dashboard/admin",
};
