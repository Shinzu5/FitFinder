import { Response } from "express";
import { env } from "../config/env";

export function getAuthCookieOptions() {
  const isProduction = env.NODE_ENV === "production";
  const sameSiteMode: "none" | "lax" = isProduction ? "none" : "lax";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteMode,
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
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response): void {
  const options = getAuthCookieOptions();
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
}
