import { resend } from "@/config/email";
import { env } from "@/config/env";
import { EmailEnabledState } from "@/services/email/email-state";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function SendEmailService({ to, subject, html }: SendEmailOptions) {
  if (!EmailEnabledState.enabled) {
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
