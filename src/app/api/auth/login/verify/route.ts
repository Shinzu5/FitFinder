import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { validateSubmittedCode } from "@/lib/auth/server/verification";
import { createAccessToken, verifyLoginChallengeToken } from "@/lib/auth/server/jwt";
import { toAuthUser } from "@/lib/auth/server/user-mapper";
import { jsonError, mapVerificationError } from "@/lib/auth/server/api-errors";

const verifyLoginSchema = z.object({
  loginToken: z.string().min(1, "Login session expired. Please sign in again."),
  code: z
    .string()
    .trim()
    .length(6, "Verification code must be 6 digits.")
    .regex(/^\d{6}$/, "Verification code must contain only numbers."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyLoginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid verification data.", 400);
    }

    const challenge = await verifyLoginChallengeToken(parsed.data.loginToken);
    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });

    if (!user || user.email.toLowerCase() !== challenge.email.toLowerCase()) {
      return jsonError("Login session expired. Please sign in again.", 401, {
        code: "INVALID_LOGIN_TOKEN",
      });
    }

    if (!user.emailVerified) {
      return jsonError("Please verify your email before signing in.", 403, {
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    await validateSubmittedCode({
      userId: user.id,
      code: parsed.data.code,
      type: "LOGIN",
    });

    const accessToken = await createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    return NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      accessToken,
      user: toAuthUser(user),
      role: user.role,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("expired")) {
      return jsonError("Login session expired. Please sign in again.", 401, {
        code: "INVALID_LOGIN_TOKEN",
      });
    }

    const mapped = mapVerificationError(error);
    if (mapped.status !== 500) return mapped;
    console.error("[auth/login/verify]", error);
    return jsonError("Unable to complete sign-in.", 500);
  }
}
