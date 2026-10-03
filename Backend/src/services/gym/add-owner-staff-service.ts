import { UserRepository } from "@/repositories/user.repository";
import { hashPassword } from "@/utils/hash";
import { EmitAdminUsersUpdatedService as emitAdminUsersUpdated } from "@/services/realtime/emit-admin-users-updated-service";
import { EmitMembersUpdatedService as emitMembersUpdated } from "@/services/realtime/emit-members-updated-service";

const userRepository = new UserRepository();

type AddOwnerStaffResult =
  | { kind: "exists" }
  | {
      kind: "ok";
      clerk: { id: string; fullName: string; email: string };
    };

/**
 * POST /api/owner/staff — create a brand-new CLERK account with the
 * email/password the owner enters, so the clerk can log in immediately.
 */
export async function AddOwnerStaffService(input: {
  gymId: string;
  fullName: string;
  /** Already trimmed + lowercased by the caller. */
  email: string;
  password: string;
}): Promise<AddOwnerStaffResult> {
  const existing = await userRepository.findByEmail(input.email);

  if (existing) {
    return { kind: "exists" };
  }

  const passwordHash = await hashPassword(input.password);

  const clerk = await userRepository.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    role: "CLERK",
    emailVerified: true, // owner-created staff accounts skip email verification
    clerkGymId: input.gymId,
  });

  void emitAdminUsersUpdated();
  // Reuse members_updated so Owner Overview Front Desk Staff refreshes live
  void emitMembersUpdated(input.gymId);

  return { kind: "ok", clerk };
}
