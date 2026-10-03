import { AuthRepository } from "@/repositories/auth.repository";

const authRepository = new AuthRepository();

/**
 * Identity probe used on every authenticated request.
 * Returns id + role + assigned gym for the token subject, or null when the
 * account no longer exists (deleted / unassigned clerk accounts are rejected).
 */
export async function FindAuthUserService(userId: string) {
  return authRepository.findAuthUserById(userId);
}
