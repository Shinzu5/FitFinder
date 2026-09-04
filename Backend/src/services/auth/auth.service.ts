import { UserRepository } from "../../repositories/user.repository";
import { env } from "../../config/env";
import {
  hashPassword,
  comparePassword,
  generateVerificationCode,
  hashToken,
  tokensMatch,
  generateResetSessionToken,
} from "../../utils/hash";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from "../../utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email.service";
import { emitAdminUsersUpdated } from "../realtime.service";

export interface AuthServiceResult {
  statusCode: number;
  message: string;
  data?: unknown;
  errors?: unknown;
}

export class AuthService {
  constructor(private readonly userRepository = new UserRepository()) {}

  private getResetExpiryDate(): Date {
    return new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
  }

  private async clearResetState(userId: string): Promise<void> {
    await this.userRepository.clearResetState(userId);
  }

  async register(input: {
    fullName: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<AuthServiceResult> {
    try {
      const normalizedEmail = String(input.email).toLowerCase().trim();
      const existing = await this.userRepository.findByEmail(normalizedEmail);

      if (existing && existing.emailVerified) {
        return {
          statusCode: 409,
          message: "An account with that email already exists.",
        };
      }

      const allowedRoles = ["USER", "OWNER"] as const;
      const requestedRole = String(input.role || "USER");
      const userRole: "USER" | "OWNER" | "CLERK" | "ADMIN" = allowedRoles.includes(requestedRole as "USER" | "OWNER")
        ? (requestedRole as "USER" | "OWNER")
        : "USER";
      const passwordHash = await hashPassword(String(input.password));
      const verificationCode = generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

      const user = existing
        ? await this.userRepository.updateById(existing.id, {
            fullName: input.fullName,
            passwordHash,
            role: userRole,
            verificationCode,
            verificationExpires,
          })
        : await this.userRepository.create({
            fullName: input.fullName,
            email: normalizedEmail,
            passwordHash,
            role: userRole,
            verificationCode,
            verificationExpires,
          });

      try {
        await sendVerificationEmail(user.email, user.fullName, verificationCode);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      return {
        statusCode: 201,
        message: "Account created. Please check your email for the verification code.",
        data: {
          userId: user.id,
          email: user.email,
          requiresVerification: true,
        },
      };
    } catch (error) {
      console.error("Register error:", error);
      return {
        statusCode: 500,
        message: "Registration failed",
      };
    }
  }

  async verifyEmail(input: { email: string; code: string }): Promise<AuthServiceResult> {
    try {
      const user = await this.userRepository.findByEmail(String(input.email).toLowerCase());

      if (!user) {
        return { statusCode: 404, message: "User not found" };
      }

      if (user.emailVerified) {
        return { statusCode: 200, message: "Email is already verified", data: null };
      }

      if (!user.verificationCode || !user.verificationExpires || user.verificationCode !== String(input.code)) {
        return { statusCode: 400, message: "Invalid verification code" };
      }

      if (new Date() > user.verificationExpires) {
        return {
          statusCode: 400,
          message: "Verification code has expired. Please request a new one.",
        };
      }

      await this.userRepository.updateById(user.id, {
        emailVerified: true,
        verificationCode: null,
        verificationExpires: null,
      });

      void emitAdminUsersUpdated();

      return { statusCode: 200, message: "Email verified successfully", data: null };
    } catch (error) {
      console.error("Verify email error:", error);
      return { statusCode: 500, message: "Verification failed" };
    }
  }

  async resendVerification(input: { email: string }): Promise<AuthServiceResult> {
    try {
      const user = await this.userRepository.findByEmail(String(input.email).toLowerCase());

      if (!user) {
        return { statusCode: 200, message: "If the email exists, a new code has been sent.", data: null };
      }

      if (user.emailVerified) {
        return { statusCode: 200, message: "Email is already verified", data: null };
      }

      const verificationCode = generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

      await this.userRepository.updateById(user.id, { verificationCode, verificationExpires });
      await sendVerificationEmail(user.email, user.fullName, verificationCode);

      return {
        statusCode: 200,
        message: "A new verification code has been sent to your email.",
        data: null,
      };
    } catch (error) {
      console.error("Resend verification error:", error);
      return { statusCode: 500, message: "Failed to resend verification" };
    }
  }

  async login(input: { email: string; password: string }): Promise<AuthServiceResult> {
    try {
      const email = typeof input.email === "string" ? input.email.trim() : "";
      const password = typeof input.password === "string" ? input.password : "";

      if (!email || !password) {
        return { statusCode: 400, message: "Email and password are required." };
      }

      const user = await this.userRepository.findByEmail(email.toLowerCase());
      if (!user) {
        return { statusCode: 401, message: "Invalid email or password." };
      }

      const validPassword = await comparePassword(password, user.passwordHash);
      if (!validPassword) {
        return { statusCode: 401, message: "Invalid email or password." };
      }

      if (!user.emailVerified) {
        return { statusCode: 403, message: "Please verify your email before logging in." };
      }

      if (user.role === "CLERK" && !user.clerkGymId) {
        return {
          statusCode: 403,
          message: "Your account has been removed by the Gym Owner.",
        };
      }

      const tokenPayload = { userId: user.id, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await this.userRepository.setRefreshToken(user.id, refreshToken);

      return {
        statusCode: 200,
        message: "Welcome back!",
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return { statusCode: 500, message: "Login failed" };
    }
  }

  async refreshToken(input: { refreshToken?: string }): Promise<AuthServiceResult> {
    try {
      const token = input.refreshToken;
      if (!token) {
        return { statusCode: 401, message: "Refresh token required" };
      }

      const payload = verifyRefreshToken(token);
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        return {
          statusCode: 401,
          message: "Your account has been removed. Please sign in again.",
          errors: { code: "ACCOUNT_DELETED" },
        };
      }

      if (user.role === "CLERK" && !user.clerkGymId) {
        return {
          statusCode: 401,
          message: "Your account has been removed by the Gym Owner.",
          errors: { code: "ACCOUNT_DELETED" },
        };
      }

      if (user.refreshToken !== token) {
        return { statusCode: 401, message: "Invalid refresh token" };
      }

      const tokenPayload = { userId: user.id, role: user.role };
      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      await this.userRepository.setRefreshToken(user.id, newRefreshToken);

      return {
        statusCode: 200,
        message: "Token refreshed",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
        },
      };
    } catch (error) {
      return { statusCode: 401, message: "Invalid refresh token" };
    }
  }

  async forgotPassword(input: { email: string }): Promise<AuthServiceResult> {
    try {
      const normalizedEmail = String(input.email).toLowerCase().trim();
      const user = await this.userRepository.findByEmail(normalizedEmail);
      const genericMessage = "If an account exists for this email, a verification code has been sent.";

      if (!user) {
        return { statusCode: 200, message: genericMessage, data: { email: normalizedEmail } };
      }

      const resetCode = generateVerificationCode();
      const resetExpires = this.getResetExpiryDate();

      await this.userRepository.updateById(user.id, {
        resetToken: hashToken(resetCode),
        resetExpires,
        resetVerified: false,
        resetAttempts: 0,
      });

      try {
        await sendPasswordResetEmail(user.email, user.fullName, resetCode);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }

      return {
        statusCode: 200,
        message: genericMessage,
        data: { email: user.email },
      };
    } catch (error) {
      console.error("Forgot password error:", error);
      return { statusCode: 500, message: "Failed to process request" };
    }
  }

  async verifyResetCode(input: { email: string; code: string }): Promise<AuthServiceResult> {
    try {
      const normalizedEmail = String(input.email).toLowerCase().trim();
      const submittedCode = String(input.code).trim();
      const user = await this.userRepository.findByEmail(normalizedEmail);

      if (!user || !user.resetToken || !user.resetExpires || user.resetVerified) {
        return { statusCode: 400, message: "Invalid or expired verification code." };
      }

      if (user.resetAttempts >= env.PASSWORD_RESET_MAX_ATTEMPTS) {
        return {
          statusCode: 429,
          message: "Too many failed attempts. Please request a new verification code.",
        };
      }

      if (new Date() > user.resetExpires) {
        await this.clearResetState(user.id);
        return {
          statusCode: 400,
          message: "Verification code has expired. Please request a new one.",
        };
      }

      if (!tokensMatch(submittedCode, user.resetToken)) {
        const attempts = user.resetAttempts + 1;
        await this.userRepository.updateById(user.id, { resetAttempts: attempts });

        const remaining = env.PASSWORD_RESET_MAX_ATTEMPTS - attempts;
        if (remaining <= 0) {
          await this.clearResetState(user.id);
          return {
            statusCode: 429,
            message: "Too many failed attempts. Please request a new verification code.",
          };
        }

        return {
          statusCode: 400,
          message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        };
      }

      const sessionToken = generateResetSessionToken();
      const sessionExpires = this.getResetExpiryDate();

      await this.userRepository.updateById(user.id, {
        resetToken: hashToken(sessionToken),
        resetExpires: sessionExpires,
        resetVerified: true,
        resetAttempts: 0,
      });

      return {
        statusCode: 200,
        message: "Code verified. You can now set a new password.",
        data: {
          email: user.email,
          resetToken: sessionToken,
          expiresInMinutes: env.PASSWORD_RESET_EXPIRES_MINUTES,
        },
      };
    } catch (error) {
      console.error("Verify reset code error:", error);
      return { statusCode: 500, message: "Verification failed" };
    }
  }

  async resetPassword(input: { email: string; resetToken: string; newPassword: string }): Promise<AuthServiceResult> {
    try {
      const normalizedEmail = String(input.email).toLowerCase().trim();
      const token = String(input.resetToken || "").trim();
      const user = await this.userRepository.findByEmail(normalizedEmail);

      if (!user || !user.resetToken || !user.resetExpires || !user.resetVerified || !token) {
        return {
          statusCode: 400,
          message: "Invalid or expired reset session. Please start again.",
        };
      }

      if (new Date() > user.resetExpires) {
        await this.clearResetState(user.id);
        return {
          statusCode: 400,
          message: "Reset session has expired. Please request a new verification code.",
        };
      }

      if (!tokensMatch(token, user.resetToken)) {
        return {
          statusCode: 400,
          message: "Invalid or already-used reset session. Please start again.",
        };
      }

      const passwordHash = await hashPassword(String(input.newPassword));

      await this.userRepository.updateById(user.id, {
        passwordHash,
        resetToken: null,
        resetExpires: null,
        resetVerified: false,
        resetAttempts: 0,
        refreshToken: null,
      });

      return {
        statusCode: 200,
        message: "Password reset successfully. You can now log in with your new password.",
        data: null,
      };
    } catch (error) {
      console.error("Reset password error:", error);
      return { statusCode: 500, message: "Failed to reset password" };
    }
  }

  async changePassword(input: { userId: string; currentPassword: string; newPassword: string }): Promise<AuthServiceResult> {
    try {
      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { statusCode: 404, message: "User not found" };
      }

      const validPassword = await comparePassword(input.currentPassword, user.passwordHash);
      if (!validPassword) {
        return { statusCode: 400, message: "Current password is incorrect" };
      }

      const passwordHash = await hashPassword(input.newPassword);
      await this.userRepository.updateById(user.id, { passwordHash });

      return { statusCode: 200, message: "Password updated successfully", data: null };
    } catch (error) {
      console.error("Change password error:", error);
      return { statusCode: 500, message: "Failed to change password" };
    }
  }

  async getMe(userId: string): Promise<AuthServiceResult> {
    try {
      const user = await this.userRepository.getMe(userId);
      if (!user) {
        return { statusCode: 404, message: "User not found" };
      }

      return { statusCode: 200, message: "Success", data: { user } };
    } catch (error) {
      console.error("Get me error:", error);
      return { statusCode: 500, message: "Failed to get profile" };
    }
  }

  async updateMe(input: { userId: string; fullName?: string; avatarUrl?: string }): Promise<AuthServiceResult> {
    try {
      const data: Record<string, unknown> = {};
      if (input.fullName) data.fullName = input.fullName;
      if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

      const user = await this.userRepository.updateProfile(input.userId, data);
      return { statusCode: 200, message: "Profile updated", data: { user } };
    } catch (error) {
      console.error("Update me error:", error);
      return { statusCode: 500, message: "Failed to update profile" };
    }
  }

  async logout(input: { userId?: string; authorizationHeader?: string; refreshToken?: string }): Promise<AuthServiceResult> {
    try {
      let userId = input.userId;

      if (!userId && input.authorizationHeader?.startsWith("Bearer ")) {
        try {
          const payload = verifyAccessToken(input.authorizationHeader.split(" ")[1]);
          userId = payload.userId;
        } catch {
          // ignore invalid access token
        }
      }

      if (!userId && input.refreshToken) {
        try {
          const payload = verifyRefreshToken(input.refreshToken);
          userId = payload.userId;
        } catch {
          // ignore invalid refresh token
        }
      }

      if (userId) {
        await this.userRepository.setRefreshToken(userId, null);
      }

      return {
        statusCode: 200,
        message: "Logged out successfully",
        data: null,
      };
    } catch (error) {
      return { statusCode: 200, message: "Logged out", data: null };
    }
  }
}
