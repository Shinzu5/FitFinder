import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  assertResendAllowed,
  issueVerificationCode,
} from "@/lib/auth/server/verification";
import { verifyLoginChallengeToken } from "@/lib/auth/server/jwt";
import { jsonError, mapVerificationError, mapEmailSendError } from "@/lib/auth/server/api-errors";

const resendSchema = z.object({
  loginToken: z.string().min(1, "Login session expired. Please sign in again."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid resend request.", 400);
    }

    const challenge = await verifyLoginChallengeToken(parsed.data.loginToken);
    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });

    if (!user || user.email.toLowerCase() !== challenge.email.toLowerCase()) {
      return jsonError("Login session expired. Please sign in again.", 401, {
        code: "INVALID_LOGIN_TOKEN",
      });
    }

    await assertResendAllowed(user.id, "LOGIN");

    await issueVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      type: "LOGIN",
    });

    return NextResponse.json({
      success: true,
      message: "A new login verification code has been sent.",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("expired")) {
      return jsonError("Login session expired. Please sign in again.", 401, {
        code: "INVALID_LOGIN_TOKEN",
      });
    }

    const mapped = mapVerificationError(error);
    if (mapped.status !== 500) return mapped;

    if (
      error instanceof Error &&
      (error.message === "EMAIL_SEND_FAILED" || error.message === "EMAIL_NOT_CONFIGURED")
    ) {
      return mapEmailSendError(error);
    }

    console.error("[auth/login/resend]", error);
    return jsonError("Unable to resend login verification code.", 500);
  }
}
