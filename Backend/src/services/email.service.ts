import { resend } from "../config/email";
import { env } from "../config/env";

let emailEnabled = false;

export function setEmailEnabled(enabled: boolean) {
  emailEnabled = enabled;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!emailEnabled) {
    console.log(`\n📧 EMAIL NOT SENT (Resend API key not configured)`);
    console.log(`   To: ${Array.isArray(to) ? to.join(", ") : to}`);
    console.log(`   Subject: ${subject}`);
    return null;
  }

  try {
    const from = env.RESEND_FROM || "FitFinder <noreply@fitfinder.fun>";
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend email error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Email service error:", error);
    throw error;
  }
}

export async function sendVerificationEmail(
  to: string,
  fullName: string,
  code: string
): Promise<void> {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #e5e5e5; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">FitFinder</h1>
        <p style="color: #a3a3a3; margin: 4px 0 0;">Email Verification</p>
      </div>
      <p style="margin: 0 0 16px;">Hi <strong>${fullName}</strong>,</p>
      <p style="margin: 0 0 24px;">Use the code below to verify your email address. This code expires in <strong>15 minutes</strong>.</p>
      <div style="text-align: center; padding: 20px; background: #171717; border-radius: 8px; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${code}</span>
      </div>
      <p style="color: #737373; font-size: 13px; margin: 0;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;

  if (!emailEnabled) {
    console.log(`\n📧 VERIFICATION EMAIL (not sent — Resend not configured)`);
    console.log(`   To: ${to}`);
    console.log(`   Code: ${code}\n`);
    return;
  }

  await sendEmail({
    to,
    subject: "FitFinder — Verify Your Email",
    html,
  });
  console.log(`✅ Verification email sent via Resend to ${to}`);
}

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  code: string
): Promise<void> {
  const minutes = env.PASSWORD_RESET_EXPIRES_MINUTES;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #e5e5e5; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">FitFinder</h1>
        <p style="color: #a3a3a3; margin: 4px 0 0;">Password Reset</p>
      </div>
      <p style="margin: 0 0 16px;">Hi <strong>${fullName}</strong>,</p>
      <p style="margin: 0 0 24px;">Use the verification code below to reset your password. This code expires in <strong>${minutes} minutes</strong>.</p>
      <div style="text-align: center; padding: 20px; background: #171717; border-radius: 8px; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${code}</span>
      </div>
      <p style="color: #737373; font-size: 13px; margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  if (!emailEnabled) {
    console.log(`\n📧 PASSWORD RESET EMAIL (not sent — Resend not configured)`);
    console.log(`   To: ${to}`);
    console.log(`   Code: ${code}\n`);
    return;
  }

  await sendEmail({
    to,
    subject: "FitFinder — Reset Your Password",
    html,
  });
  console.log(`✅ Password reset email sent via Resend to ${to}`);
}
