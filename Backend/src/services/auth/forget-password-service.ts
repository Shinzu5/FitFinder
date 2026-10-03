import { UserRepository } from "@/repositories/user.repository";
import { generateVerificationCode, hashToken } from "@/utils/hash";
import { SendPasswordResetEmailService as sendPasswordResetEmail } from "@/services/email/send-password-reset-email-service";
import { env } from "@/config/env";

/** POST /api/auth/forgot-password — emails a 6-digit reset OTP. */
export async function ForgetPasswordService(email: string) {
  const userRepository = new UserRepository();

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);
    const genericMessage = "If an account exists for this email, a verification code has been sent.";

    if (!user) {
      return { statusCode: 200, message: genericMessage, data: { email: normalizedEmail } };
    }

    const resetCode = generateVerificationCode();
    const resetExpires = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

    await userRepository.updateById(user.id, {
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
    console.error("ForgetPasswordService error:", error);
    return { statusCode: 500, message: "Failed to process request" };
  }
}
