import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { hashPassword, tokensMatch } from "@/utils/hash";

/** POST /api/auth/reset-password — consumes the verified reset session. */
export async function ResetPasswordService(email: string, resetToken: string, newPassword: string) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const token = String(resetToken || "").trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user || !user.resetToken || !user.resetExpires || !user.resetVerified || !token) {
      return {
        statusCode: 400,
        message: "Invalid or expired reset session. Please start again.",
      };
    }

    if (new Date() > user.resetExpires) {
      await userRepository.clearResetState(user.id);
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

    const passwordHash = await hashPassword(String(newPassword));

    await userRepository.updateById(user.id, {
      passwordHash,
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
      refreshToken: null,
    });

    // Kill every issued refresh token so all sessions die with the password.
    await tokenRepository.revokeAllRefreshTokens(user.id);

    return {
      statusCode: 200,
      message: "Password reset successfully. You can now log in with your new password.",
      data: null,
    };
  } catch (error) {
    console.error("ResetPasswordService error:", error);
    return { statusCode: 500, message: "Failed to reset password" };
  }
}
