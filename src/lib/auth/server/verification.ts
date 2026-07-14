import bcrypt from "bcryptjs";
import type { VerificationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendVerificationEmail } from "@/lib/email/email-service";

import { CODE_EXPIRY_MINUTES, RESEND_COOLDOWN_SECONDS } from "@/lib/auth/constants";

/** Generates a random 6-digit verification code. */
export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashVerificationCode(code: string) {
  return bcrypt.hash(code, 10);
}

export async function verifyVerificationCode(code: string, codeHash: string) {
  return bcrypt.compare(code, codeHash);
}

function getExpiryDate() {
  return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
}

/** Deletes previous codes of the same type before issuing a new one. */
export async function invalidateExistingCodes(userId: string, type: VerificationType) {
  await prisma.verificationCode.deleteMany({
    where: { userId, type },
  });
}

export async function issueVerificationCode(input: {
  userId: string;
  email: string;
  fullName: string;
  type: VerificationType;
}) {
  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);

  await invalidateExistingCodes(input.userId, input.type);

  await prisma.verificationCode.create({
    data: {
      userId: input.userId,
      codeHash,
      type: input.type,
      expiresAt: getExpiryDate(),
    },
  });

  await sendVerificationEmail({
    to: input.email,
    code,
    purpose: input.type === "REGISTER" ? "registration" : "login",
    fullName: input.fullName,
  });

  return code;
}

export async function assertResendAllowed(userId: string, type: VerificationType) {
  const latest = await prisma.verificationCode.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return;

  const elapsedMs = Date.now() - latest.createdAt.getTime();
  if (elapsedMs < RESEND_COOLDOWN_SECONDS * 1000) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
    throw new Error(`COOLDOWN:${waitSeconds}`);
  }
}

export async function validateSubmittedCode(input: {
  userId: string;
  code: string;
  type: VerificationType;
}) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId: input.userId, type: input.type },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("INVALID");
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.verificationCode.delete({ where: { id: record.id } });
    throw new Error("EXPIRED");
  }

  const matches = await verifyVerificationCode(input.code, record.codeHash);
  if (!matches) {
    throw new Error("INCORRECT");
  }

  await prisma.verificationCode.delete({ where: { id: record.id } });
  return record;
}
