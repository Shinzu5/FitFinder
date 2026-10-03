/**
 * Legacy JWT entry — delegates to the canonical single-secret `lib/jwt`
 * so untouched call sites (socket, gym/payment controllers) keep working.
 * New code must import from `@/lib/jwt` directly.
 */
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken as verifyAccess,
  verifyRefreshToken as verifyRefresh,
} from "@/lib/jwt";
import { TokenExpiry } from "@/types/auth";

interface TokenPayload {
  userId: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return signAccessToken(payload.userId, payload.role, TokenExpiry.ACCESS_TOKEN_EXPIRES);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return signRefreshToken(payload.userId, payload.role, TokenExpiry.REFRESH_TOKEN_EXPIRES);
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = verifyAccess(token);
  if (!payload) throw new Error("Invalid or expired token");
  return { userId: payload.sub, role: payload.role };
}

export function verifyRefreshToken(token: string): TokenPayload {
  const payload = verifyRefresh(token);
  if (!payload) throw new Error("Invalid or expired token");
  return { userId: payload.sub, role: payload.role };
}
