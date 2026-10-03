import { UserRole } from "@prisma/client";
import { UserRepository } from "@/repositories/user.repository";
import { AdminRepository } from "@/repositories/admin.repository";
import { EmitAdminUsersUpdatedService as emitAdminUsersUpdated } from "@/services/realtime/emit-admin-users-updated-service";
import { KickUserSessionService as kickUserSession } from "@/services/admin/kick-user-session-service";

type RemovalResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

const userRepository = new UserRepository();
const adminRepository = new AdminRepository();

/**
 * Permanently remove a platform user and revoke live sessions.
 */
export async function PermanentlyDeleteUserService(
  userId: string,
  options: {
    message: string;
    /** If set, only these roles may be deleted by this call. */
    allowRoles?: UserRole[];
  },
): Promise<RemovalResult> {
  const user = await userRepository.findById(userId);

  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }

  if (user.role === "ADMIN") {
    return { ok: false, status: 403, message: "Cannot remove admin users" };
  }

  if (options.allowRoles && !options.allowRoles.includes(user.role)) {
    return { ok: false, status: 400, message: "User cannot be removed with this action" };
  }

  kickUserSession(userId, options.message);

  try {
    await adminRepository.purgeUserRecords(userId);
  } catch (error) {
    console.error("permanentlyDeleteUser failed:", error);
    return {
      ok: false,
      status: 500,
      message:
        user.role === "CLERK"
          ? "Failed to delete clerk account. Related gym records could not be cleaned up."
          : "Failed to remove user",
    };
  }

  void emitAdminUsersUpdated();
  return { ok: true };
}
