import { UserRepository } from "@/repositories/user.repository";
import { emitAdminUsersUpdated } from "@/services/realtime/realtime.service";

/** POST /api/auth/verify-email — confirms the 6-digit OTP code. */
export async function VerifyEmailService(email: string, code: string) {
  const userRepository = new UserRepository();

  try {
    const user = await userRepository.findByEmail(String(email).toLowerCase());

    if (!user) {
      return { statusCode: 404, message: "User not found" };
    }

    if (user.emailVerified) {
      return { statusCode: 200, message: "Email is already verified", data: null };
    }

    if (!user.verificationCode || !user.verificationExpires || user.verificationCode !== String(code)) {
      return { statusCode: 400, message: "Invalid verification code" };
    }

    if (new Date() > user.verificationExpires) {
      return {
        statusCode: 400,
        message: "Verification code has expired. Please request a new one.",
      };
    }

    await userRepository.updateById(user.id, {
      emailVerified: true,
      verificationCode: null,
      verificationExpires: null,
    });

    void emitAdminUsersUpdated();

    return { statusCode: 200, message: "Email verified successfully", data: null };
  } catch (error) {
    console.error("VerifyEmailService error:", error);
    return { statusCode: 500, message: "Verification failed" };
  }
}
