import { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "@/types/auth";

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  userId?: string;
  userRole?: string;
};

/**
 * Middleware to check if the authenticated user has one of the required roles.
 * Accepts `permittedRole(["ADMIN"])` (reference style) or the legacy
 * variadic `requireRole("CLERK", "OWNER")` form.
 * @param roles Array of allowed roles
 */
export const permittedRole = (roles: string[] | string, ...rest: string[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles, ...rest];

  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const role = authReq.user?.role ?? authReq.userRole;

    if (!authReq.user && !authReq.userId) {
      return res.status(401).json({
        code: 401,
        status: "error",
        message: "Authentication required",
      });
    }
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({
        code: 403,
        status: "error",
        message: "Forbidden: You do not have the required role",
      });
    }

    return next();
  };
};