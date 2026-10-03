import jwt, { SignOptions } from "jsonwebtoken";
import { ENV } from "@/config/env";
import type { JwtPayload } from "@/types/auth";

export function signAccessToken(userId: string, role: string, duration: SignOptions["expiresIn"]) {
  const payload: JwtPayload = { sub: userId, role, type: "access" };
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: duration });
}

export function signRefreshToken(userId: string, role: string, duration: SignOptions["expiresIn"]) {
  const payload: JwtPayload = { sub: userId, role, type: "refresh" };
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: duration });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    return payload.type === "access" ? payload : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    return payload.type === "refresh" ? payload : null;
  } catch {
    return null;
  }
}

/** Cookie maxAge helper — `ms(15, "minutes")`, `ms(7, "days")`. */
export function ms(value: number, unit: "seconds" | "minutes" | "hours" | "days"): number {
  switch (unit) {
    case "seconds":
      return value * 1000;
    case "minutes":
      return value * 60 * 1000;
    case "hours":
      return value * 60 * 60 * 1000;
    case "days":
      return value * 24 * 60 * 60 * 1000;
  }
}

export function toMilliseconds(duration?: string | number) {
  if (duration === undefined) return undefined;
  if (typeof duration === "number") {
    return duration * 1000;
  }

  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return undefined;

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return undefined;
  }
}
