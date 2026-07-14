import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/server/password";
import { issueVerificationCode } from "@/lib/auth/server/verification";
import { jsonError, mapEmailSendError } from "@/lib/auth/server/api-errors";

const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
  role: z.enum(["USER", "OWNER"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid registration data.", 400);
    }

    const { fullName, email, password, confirmPassword, role } = parsed.data;

    if (password !== confirmPassword) {
      return jsonError("Passwords do not match.", 400);
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser?.emailVerified) {
      return jsonError("An account with that email already exists.", 409);
    }

    const passwordHash = await hashPassword(password);

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            fullName,
            passwordHash,
            role,
            emailVerified: false,
          },
        })
      : await prisma.user.create({
          data: {
            fullName,
            email: normalizedEmail,
            passwordHash,
            role,
            emailVerified: false,
          },
        });

    await issueVerificationCode({
      userId: user.id,
      email: normalizedEmail,
      fullName,
      type: "REGISTER",
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent. Check your email to activate your account.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("[auth/register]", error);
    if (
      error instanceof Error &&
      (error.message === "EMAIL_SEND_FAILED" || error.message === "EMAIL_NOT_CONFIGURED")
    ) {
      return mapEmailSendError(error);
    }
    return jsonError("Unable to complete registration. Please try again.", 500);
  }
}
