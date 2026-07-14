import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { validateSubmittedCode } from "@/lib/auth/server/verification";
import { jsonError, mapVerificationError } from "@/lib/auth/server/api-errors";

const verifyRegisterSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  code: z
    .string()
    .trim()
    .length(6, "Verification code must be 6 digits.")
    .regex(/^\d{6}$/, "Verification code must contain only numbers."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid verification data.", 400);
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return jsonError("No account found for this email.", 404);
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Email is already verified. You can sign in now.",
      });
    }

    await validateSubmittedCode({
      userId: user.id,
      code: parsed.data.code,
      type: "REGISTER",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    const mapped = mapVerificationError(error);
    if (mapped.status !== 500) return mapped;
    console.error("[auth/register/verify]", error);
    return jsonError("Unable to verify email.", 500);
  }
}
