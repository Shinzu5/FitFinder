import { Request, Response, NextFunction } from "express";

/** Status-aware global error hook (reference-style). Keeps `{ success }` envelope. */
export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("❌ Error:", err.message);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  const statusCode =
    (typeof err.status === "number" && err.status) ||
    (typeof err.statusCode === "number" && err.statusCode) ||
    500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "development" || statusCode !== 500
        ? err.message
        : "Internal server error",
  });
}
