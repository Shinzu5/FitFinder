import { UserRepository } from "@/repositories/user.repository";
import { generateVerificationCode } from "@/utils/hash";
import { SendVerificationEmailService as sendVerificationEmail } from "@/services/email/send-verification-email-service";

/** POST /api/auth/resend-verification — issues a fresh 6-digit OTP. */
export async function ResendEmailVerificationService(email: string) {
  const userRepository = new UserRepository();

  try {
    const user = await userRepository.findByEmail(String(email).toLowerCase().trim());

    if (!user) {
      return { statusCode: 200, message: "If the email exists, a new code has been sent.", data: null };
    }

    if (user.emailVerified) {
      return { statusCode: 200, message: "Email is already verified", data: null };
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    await userRepository.updateById(user.id, { verificationCode, verificationExpires });
    await sendVerificationEmail(user.email, user.fullName, verificationCode);

    return {
      statusCode: 200,
      message: "A new verification code has been sent to your email.",
      data: null,
    };
  } catch (error) {
    console.error("ResendEmailVerificationService error:", error);
    return { statusCode: 500, message: "Failed to resend verification" };
  }
}
