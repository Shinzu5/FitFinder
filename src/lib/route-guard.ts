import { redirect } from "next/navigation";
import { getDashboardPathForRole } from "@/stores/auth-store";
import { type UserRole } from "@/lib/mock-users";

export function requireAuthSession(isAuthenticated: boolean, role: UserRole | null) {
  if (!isAuthenticated) {
    redirect("/login");
  }

  return getDashboardPathForRole(role);
}

export function requireRoleAccess(currentRole: UserRole | null, allowedRole: UserRole, fallbackPath = "/dashboard/user") {
  if (!currentRole) {
    redirect("/login");
  }

  if (currentRole !== allowedRole) {
    redirect(fallbackPath);
  }

  return true;
}
