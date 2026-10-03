import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Hash Password (bcrypt — existing hashes stay verifiable)
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

// Password Verifier
export function verifyPassword(password: string, stored: string): boolean {
  return bcrypt.compareSync(password, stored);
}
