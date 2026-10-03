import prisma from "@/config/database";

/**
 * Identity probe used on every authenticated request.
 * Rejects tokens for deleted / unassigned clerk accounts (JWT alone is not enough).
 */
export class AuthRepository {
  /** id + role + assigned gym for the token subject (auth middleware). */
  async findAuthUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, clerkGymId: true },
    });
  }
}
