import { env } from "@/config/env";

// Base64 encode the secret key for Basic Auth (platform key, or gym-owned key)
export function GetAuthHeaderService(apiKey?: string): string {
  const key = (apiKey || env.XENDIT_SECRET_KEY || "").trim();
  const encoded = Buffer.from(`${key}:`).toString("base64");
  return `Basic ${encoded}`;
}
