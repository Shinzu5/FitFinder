import { UserRepository } from "@/repositories/user.repository";
import { generateResetSessionToken, hashToken, tokensMatch } from "@/utils/hash";
import { env } from "@/config/env";

/** POST /api/auth/verify-reset-code — validates the OTP with attempt lockout. */
export async function VerifyResetCodeService(email: string, code: string) {
  const userRepository = new UserRepository();

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const submittedCode = String(code).trim();
    const user = await userRepository.findByEmail(normalizedEmail);

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
      await userRepository.clearResetState(user.id);
      return {
        statusCode: 400,
        message: "Verification code has expired. Please request a new one.",
      };
    }

    if (!tokensMatch(submittedCode, user.resetToken)) {
      const attempts = user.resetAttempts + 1;
      await userRepository.updateById(user.id, { resetAttempts: attempts });

      const remaining = env.PASSWORD_RESET_MAX_ATTEMPTS - attempts;
      if (remaining <= 0) {
        await userRepository.clearResetState(user.id);
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
    const sessionExpires = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

    await userRepository.updateById(user.id, {
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
    console.error("VerifyResetCodeService error:", error);
    return { statusCode: 500, message: "Verification failed" };
  }
}
