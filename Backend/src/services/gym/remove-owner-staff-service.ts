import { UserRepository } from "@/repositories/user.repository";
import { EmitMembersUpdatedService as emitMembersUpdated } from "@/services/realtime/emit-members-updated-service";
import { PermanentlyDeleteUserService as permanentlyDeleteUser } from "@/services/admin/permanently-delete-user-service";

const userRepository = new UserRepository();

type RemoveOwnerStaffResult =
  | { kind: "not-found" }
  | { kind: "error"; status: number; message: string }
  | { kind: "ok" };

/**
 * DELETE /api/owner/staff/:id — permanently remove this gym's clerk +
 * revoke session (scoped to the owner's gym).
 */
export async function RemoveOwnerStaffService(input: {
  gymId: string;
  clerkId: string;
}): Promise<RemoveOwnerStaffResult> {
  const clerk = await userRepository.findRoleAndClerkGymById(input.clerkId);

  if (!clerk || clerk.role !== "CLERK" || clerk.clerkGymId !== input.gymId) {
    return { kind: "not-found" };
  }

  const result = await permanentlyDeleteUser(input.clerkId, {
    message: "Your account has been removed by the Gym Owner.",
    allowRoles: ["CLERK"],
  });

  if (!result.ok) {
    return { kind: "error", status: result.status, message: result.message };
  }

  void emitMembersUpdated(input.gymId);

  return { kind: "ok" };
}
