import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  assertResendAllowed,
  issueVerificationCode,
} from "@/lib/auth/server/verification";
import { jsonError, mapVerificationError, mapEmailSendError } from "@/lib/auth/server/api-errors";

const resendSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid email address.", 400);
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return jsonError("No account found for this email.", 404);
    }

    if (user.emailVerified) {
      return jsonError("This email is already verified.", 400, { code: "ALREADY_VERIFIED" });
    }

    await assertResendAllowed(user.id, "REGISTER");

    await issueVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      type: "REGISTER",
    });

    return NextResponse.json({
      success: true,
      message: "A new verification code has been sent.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "EMAIL_SEND_FAILED" || error.message === "EMAIL_NOT_CONFIGURED")
    ) {
      return mapEmailSendError(error);
    }

    const mapped = mapVerificationError(error);
    if (mapped.status !== 500) return mapped;
    console.error("[auth/register/resend]", error);
    return jsonError("Unable to resend verification code.", 500);
  }
}
