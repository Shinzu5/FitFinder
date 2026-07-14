import type { User } from "@prisma/client";
import type { AuthUser } from "@/lib/auth/types";

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? undefined,
    emailVerified: user.emailVerified,
  };
}
