export type UserRole = "USER" | "OWNER" | "CLERK" | "ADMIN";

export const roleToDashboardPath: Record<UserRole, string> = {
  USER: "/dashboard/user",
  OWNER: "/dashboard/owner",
  CLERK: "/dashboard/clerk",
  ADMIN: "/dashboard/admin",
};
