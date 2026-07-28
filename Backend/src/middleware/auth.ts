import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Access token required" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    req.userId = payload.userId;
    req.userRole = payload.role;

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
