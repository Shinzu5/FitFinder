import { env } from "@/config/env";
import { EmailEnabledState } from "@/services/email/email-state";
import { SendEmailService as sendEmail } from "@/services/email/send-email-service";

export async function SendPasswordResetEmailService(
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

  if (!EmailEnabledState.enabled) {
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
