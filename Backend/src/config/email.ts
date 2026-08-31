import nodemailer from "nodemailer";
import { env } from "./env";

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!env.SMTP_USER || !env.SMTP_PASS || env.SMTP_USER === "your-email@gmail.com") {
      console.log("⚠️  Email not configured — verification emails will be logged to console");
      return false;
    }
    await transporter.verify();
    console.log("✅ Email service connected");
    return true;
  } catch (error) {
    console.log("⚠️  Email service not available — verification codes will be logged to console");
    return false;
  }
}
