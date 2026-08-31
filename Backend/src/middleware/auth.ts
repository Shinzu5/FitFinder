import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/** Verifies JWT Bearer token and attaches userId/role to the request (rejects deleted accounts). */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Access token required" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    // Reject tokens for deleted / unassigned clerk accounts (JWT alone is not enough)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, clerkGymId: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Your account has been removed. Please sign in again.",
        code: "ACCOUNT_DELETED",
      });
      return;
    }

    // Legacy soft-remove: CLERK with no gym assignment must not access protected routes
    if (user.role === "CLERK" && !user.clerkGymId) {
      res.status(401).json({
        success: false,
        message: "Your account has been removed by the Gym Owner.",
        code: "ACCOUNT_DELETED",
      });
      return;
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
