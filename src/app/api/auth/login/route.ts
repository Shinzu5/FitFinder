import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/server/password";
import { createLoginChallengeToken } from "@/lib/auth/server/jwt";
import { issueVerificationCode } from "@/lib/auth/server/verification";
import { jsonError, mapEmailSendError } from "@/lib/auth/server/api-errors";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid login data.", 400);
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return jsonError("Invalid email or password.", 401);
    }

    const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordValid) {
      return jsonError("Invalid email or password.", 401);
    }

    if (!user.emailVerified) {
      return jsonError(
        "Please verify your email before signing in. Check your inbox for a verification code.",
        403,
        { code: "EMAIL_NOT_VERIFIED" },
      );
    }

    await issueVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      type: "LOGIN",
    });

    const loginToken = await createLoginChallengeToken({
      sub: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Login verification code sent. Check your email.",
      email: user.email,
      loginToken,
    });
  } catch (error) {
    console.error("[auth/login]", error);
    if (
      error instanceof Error &&
      (error.message === "EMAIL_SEND_FAILED" || error.message === "EMAIL_NOT_CONFIGURED")
    ) {
      return mapEmailSendError(error);
    }
    return jsonError("Unable to sign in. Please try again.", 500);
  }
}
