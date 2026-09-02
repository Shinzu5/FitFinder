import { Resend } from "resend";
import { env } from "./env";

export const resend = new Resend(env.RESEND_API_KEY || "re_dummy");

export async function verifyEmailConfig(): Promise<boolean> {
  if (!env.RESEND_API_KEY || env.RESEND_API_KEY === "your_resend_api_key") {
    console.log("⚠️  Resend API Key not configured — verification emails will be logged to console");
    return false;
  }
  console.log("✅ Resend email service configured");
  return true;
}
