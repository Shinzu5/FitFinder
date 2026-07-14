import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/mock-users";

const ACCESS_TOKEN_TTL = "7d";
const LOGIN_CHALLENGE_TTL = "10m";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface LoginChallengePayload {
  sub: string;
  email: string;
  purpose: "login";
}

export async function createAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    fullName: payload.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
    throw new Error("Invalid access token payload.");
  }
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role as UserRole,
    fullName: typeof payload.fullName === "string" ? payload.fullName : "",
  };
}

export async function createLoginChallengeToken(payload: Omit<LoginChallengePayload, "purpose">) {
  return new SignJWT({ email: payload.email, purpose: "login" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(LOGIN_CHALLENGE_TTL)
    .sign(getJwtSecret());
}

export async function verifyLoginChallengeToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  if (
    !payload.sub ||
    typeof payload.email !== "string" ||
    payload.purpose !== "login"
  ) {
    throw new Error("Invalid login challenge token.");
  }
  return {
    userId: payload.sub,
    email: payload.email,
  };
}
