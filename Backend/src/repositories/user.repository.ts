import prisma from "../config/database";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    role?: "USER" | "OWNER" | "CLERK" | "ADMIN";
    verificationCode?: string | null;
    verificationExpires?: Date | null;
    resetToken?: string | null;
    resetExpires?: Date | null;
    resetVerified?: boolean;
    resetAttempts?: number;
    refreshToken?: string | null;
    avatarUrl?: string | null;
  }) {
    return prisma.user.create({
      data,
    });
  }

  async updateById(id: string, data: Record<string, unknown>) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async clearResetState(userId: string) {
    return this.updateById(userId, {
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    });
  }

  async setRefreshToken(userId: string, refreshToken: string | null) {
    return this.updateById(userId, { refreshToken });
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }
}
