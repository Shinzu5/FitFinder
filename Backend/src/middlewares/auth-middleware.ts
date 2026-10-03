/*
  Middleware Logic:
  1. Expect every authenticated request to send `Authorization: Bearer <accessToken>`.
  2. Fall back to the `accessToken` cookie (web clients).
  3. If the token is valid, attach its payload to `req.user` and continue.
  4. Legacy `req.userId / req.userRole` are also set so existing
     controllers and `requireRole` keep working during the port.
*/

import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/lib/jwt";
import type { JwtPayload } from "@/types/auth";
import type { AuthenticatedRequest } from "@/types/common";
import { FindAuthUserService } from "@/services/auth";

export class AuthMiddleware {
  public execute = async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    // 1. Try to get token from Authorization Header
    let accessToken = this.extractBearerToken(req.headers.authorization);

    // 2. Fallback to Cookies (for Web applications)
    if (!accessToken && req.cookies) {
      const cookieToken = req.cookies.accessToken;
      if (typeof cookieToken === "string" && cookieToken) {
        accessToken = cookieToken;
      }
    }

    if (!accessToken) {
      return res.status(401).json({ code: 401, status: "error", message: "Authentication required" });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return res.status(401).json({ code: 401, status: "error", message: "Invalid or expired token" });
    }

    // Reject tokens for deleted / unassigned clerk accounts (JWT alone is not enough)
    try {
      const user = await FindAuthUserService(payload.sub);

      if (!user) {
        return res.status(401).json({
          code: 401,
          status: "error",
          message: "Your account has been removed. Please sign in again.",
        });
      }

      if (user.role === "CLERK" && !(user as { clerkGymId?: string | null }).clerkGymId) {
        return res.status(401).json({
          code: 401,
          status: "error",
          message: "Your account has been removed by the Gym Owner.",
        });
      }

      authReq.user = { sub: user.id, role: user.role, type: "access" };
      authReq.userId = user.id;
      authReq.userRole = user.role;
    } catch {
      authReq.user = payload;
      authReq.userId = payload.sub;
      authReq.userRole = payload.role;
    }

    return next();
  };

  private extractBearerToken(header?: string) {
    if (!header) return undefined;
    const [scheme, token] = header.split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return undefined;
    return token.trim();
  }
}

export const authMiddleware = new AuthMiddleware();
/** Functional alias used by routes — identical to `authMiddleware.execute`. */
export const authenticate = authMiddleware.execute;
