import { transporter } from "../config/email";
import { env } from "../config/env";

let emailEnabled = false;

export function setEmailEnabled(enabled: boolean) {
  emailEnabled = enabled;
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
    console.log(`\n📧 VERIFICATION EMAIL (not sent — SMTP not configured)`);
    console.log(`   To: ${to}`);
    console.log(`   Code: ${code}`);
    console.log("");
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM || `"FitFinder" <${env.SMTP_USER}>`,
    to,
    subject: "FitFinder — Verify Your Email",
    html,
  });
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
    console.log(`\n📧 PASSWORD RESET EMAIL (not sent — SMTP not configured)`);
    console.log(`   To: ${to}`);
    console.log(`   Code: ${code}`);
    console.log(`   Expires in: ${minutes} minutes`);
    console.log("");
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM || `"FitFinder" <${env.SMTP_USER}>`,
    to,
    subject: "FitFinder — Reset Your Password",
    html,
  });
}
