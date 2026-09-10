import dotenv from "dotenv";
dotenv.config();

const rawFrontendUrls = [process.env.FRONTEND_URLS ?? "", process.env.FRONTEND_URL ?? ""]
  .join(",")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/** All frontend origins allowed by CORS + Socket.IO (apex + www + local dev). */
export const ALLOWED_FRONTEND_ORIGINS: string[] = Array.from(
  new Set(
    rawFrontendUrls.length > 0
      ? rawFrontendUrls
      : ["http://localhost:3000"],
  ),
);

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: ALLOWED_FRONTEND_ORIGINS[0] || "http://localhost:3000",
  FRONTEND_URLS: ALLOWED_FRONTEND_ORIGINS.join(","),
  ALLOWED_ORIGINS: ALLOWED_FRONTEND_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh-secret",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM: process.env.RESEND_FROM || "",
  /** Password-reset OTP / session token lifetime in minutes */
  PASSWORD_RESET_EXPIRES_MINUTES: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || "10", 10),
  /** Max failed OTP verification attempts before the code is locked */
  PASSWORD_RESET_MAX_ATTEMPTS: parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || "5", 10),
  XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY || "",
  XENDIT_WEBHOOK_TOKEN: process.env.XENDIT_WEBHOOK_TOKEN || "",
  
  // AI Assistant (Gemini)
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-flash-latest",
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || "1024", 10),
};
