import crypto from "crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** One-way hash for OTPs / reset session tokens (never store plaintext). */
export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function tokensMatch(plain: string, hashed: string): boolean {
  const a = Buffer.from(hashToken(plain), "hex");
  const b = Buffer.from(hashed, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateResetSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
