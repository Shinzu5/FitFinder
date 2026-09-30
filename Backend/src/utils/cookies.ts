import { Response } from "express";
import { env } from "../config/env";

/** Parse jsonwebtoken-style expiresIn ("15m", "8h", "7d", "30s") to milliseconds for cookie maxAge. */
function parseExpiresInToMs(value: string, fallbackMs: number): number {
  const trimmed = String(value || "").trim().toLowerCase();
  const match = /^(\d+)\s*([smhd])?$/.exec(trimmed);
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const unit = match[2] || "s";
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 1000);
}

export function getAuthCookieOptions() {
  // Cross-origin frontend (localhost:3000 -> localhost:5000, or fitfinder.fun -> API)
  // requires SameSite=None + Secure, otherwise the browser drops the refresh cookie
  // and silent refresh never fires.
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const options = getAuthCookieOptions();

  res.cookie("accessToken", tokens.accessToken, {
    ...options,
    maxAge: parseExpiresInToMs(env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000),
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    ...options,
    maxAge: parseExpiresInToMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000),
  });
}

export function clearAuthCookies(res: Response): void {
  const options = getAuthCookieOptions();
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
}
