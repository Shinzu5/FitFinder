import dotenv from "dotenv";
dotenv.config();

const rawFrontendUrls = [process.env.FRONTEND_URLS ?? "", process.env.FRONTEND_URL ?? ""]
  .join(",")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(rawFrontendUrls.length > 0 ? rawFrontendUrls : ["http://localhost:3000"]),
);

const isProduction = (process.env.NODE_ENV || "development") === "production";

function requireSecret(): string {
  const value = process.env.JWT_SECRET;
  if (value) return value;
  if (isProduction) {
    throw new Error(
      "Missing environment variable in production: JWT_SECRET. Set a strong random value.",
    );
  }
  console.warn("⚠️  JWT_SECRET is not set. Using insecure development default.");
  return "dev-jwt-secret-change-me";
}

export const ENV = {
  APP_NAME: process.env.APP_NAME || "FitFinder API",
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: requireSecret(),
  FRONTEND_URL: allowedOrigins[0] || "http://localhost:3000",
  FRONTEND_URLS: allowedOrigins.join(","),
  ALLOWED_ORIGINS: allowedOrigins,
  BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || "5000"}`,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-flash-latest",
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || "1024", 10),
  XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY || "",
  XENDIT_WEBHOOK_TOKEN: process.env.XENDIT_WEBHOOK_TOKEN || "",

  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: parseInt(process.env.SMTP_PORT || "587", 10),
    SECURE: process.env.SMTP_SECURE === "true",
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASSWORD,
    FROM: process.env.SMTP_FROM,
  },
};

/**
 * Legacy `env` shim — previous dual-secret shape mapped onto the single
 * JWT_SECRET model so untouched domains keep compiling during the port.
 * New code must import `ENV`.
 */
export const env = {
  PORT: ENV.PORT,
  NODE_ENV: ENV.NODE_ENV,
  FRONTEND_URL: ENV.FRONTEND_URL,
  FRONTEND_URLS: ENV.FRONTEND_URLS,
  ALLOWED_ORIGINS: ENV.ALLOWED_ORIGINS,
  DATABASE_URL: ENV.DATABASE_URL ?? "",
  JWT_ACCESS_SECRET: ENV.JWT_SECRET,
  JWT_REFRESH_SECRET: ENV.JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "7d",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM: process.env.RESEND_FROM || "",
  PASSWORD_RESET_EXPIRES_MINUTES: parseInt(
    process.env.PASSWORD_RESET_EXPIRES_MINUTES || "10",
    10,
  ),
  PASSWORD_RESET_MAX_ATTEMPTS: parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || "5", 10),
  XENDIT_SECRET_KEY: ENV.XENDIT_SECRET_KEY,
  XENDIT_WEBHOOK_TOKEN: ENV.XENDIT_WEBHOOK_TOKEN,
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
  GEMINI_API_KEY: ENV.GEMINI_API_KEY || "",
  GEMINI_MODEL: ENV.GEMINI_MODEL,
  AI_TEMPERATURE: ENV.AI_TEMPERATURE,
  AI_MAX_TOKENS: ENV.AI_MAX_TOKENS,
};
