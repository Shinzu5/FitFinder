import type { Request } from "express";
import type { JwtPayload } from "@/types/auth";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  user?: JwtPayload;
}

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  userId?: string;
  userRole?: string;
};
