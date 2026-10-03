import { AdminRepository } from "@/repositories/admin.repository";
import { PermanentlyDeleteUserService as permanentlyDeleteUser } from "@/services/admin/permanently-delete-user-service";

const adminRepository = new AdminRepository();

type RemoveAdminUserResult =
  | { kind: "not-found" }
  | { kind: "clerk-guard" }
  | { kind: "error"; status: number; message: string }
  | { kind: "ok" };

/** DELETE /api/admin/users/:id — permanent purge (clerks are owner-managed). */
export async function RemoveAdminUserService(targetId: string): Promise<RemoveAdminUserResult> {
  const existing = await adminRepository.findUserByIdAndRole(targetId);

  if (!existing) {
    return { kind: "not-found" };
  }

  // Clerks are managed by their Gym Owner — Admin may view only
  if (existing.role === "CLERK") {
    return { kind: "clerk-guard" };
  }

  const message = "Your account has been removed. Please sign in again.";

  const result = await permanentlyDeleteUser(targetId, { message });
  if (!result.ok) {
    return { kind: "error", status: result.status, message: result.message };
  }

  return { kind: "ok" };
}
