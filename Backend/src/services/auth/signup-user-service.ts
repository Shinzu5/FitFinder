import { UserRepository } from "@/repositories/user.repository";
import { hashPassword, generateVerificationCode } from "@/utils/hash";
import { SendVerificationEmailService as sendVerificationEmail } from "@/services/email/send-verification-email-service";

/** POST /api/auth/register — OTP email verification (not a magic link). */
export async function SignupUserService(
  fullName: string,
  email: string,
  password: string,
  role?: string,
) {
  const userRepository = new UserRepository();

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await userRepository.findByEmail(normalizedEmail);

    if (existing && existing.emailVerified) {
      return { statusCode: 409, message: "An account with that email already exists." };
    }

    const allowedRoles = ["USER", "OWNER"] as const;
    const requestedRole = String(role || "USER");
    const userRole: "USER" | "OWNER" | "CLERK" | "ADMIN" = allowedRoles.includes(
      requestedRole as "USER" | "OWNER",
    )
      ? (requestedRole as "USER" | "OWNER")
      : "USER";

    const passwordHash = await hashPassword(String(password));
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    // An unverified account re-registering overwrites the pending row.
    const user = existing
      ? await userRepository.updateById(existing.id, {
          fullName,
          passwordHash,
          role: userRole,
          verificationCode,
          verificationExpires,
        })
      : await userRepository.create({
          fullName,
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
    console.error("SignupUserService error:", error);
    return { statusCode: 500, message: "Registration failed" };
  }
}
