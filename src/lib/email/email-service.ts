import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type VerificationEmailPurpose = "registration" | "login";

interface SendVerificationEmailInput {
  to: string;
  code: string;
  purpose: VerificationEmailPurpose;
  fullName?: string;
}

let transporter: Transporter | null = null;

/** Skip SMTP entirely — only log codes to the server terminal. */
export function isConsoleEmailMode() {
  return process.env.EMAIL_DELIVERY_MODE === "console";
}

/** Also print codes to the terminal while sending real email (handy in dev). */
export function shouldLogVerificationCode() {
  return process.env.DEV_LOG_EMAIL_CODE === "true";
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim().replace(/\s/g, "");
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    return null;
  }

  if (pass === "test-password" || pass === "REPLACE_WITH_GMAIL_APP_PASSWORD") {
    return null;
  }

  return { host, port, user, pass, secure };
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const config = getSmtpConfig();
  if (!config) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const isGmail =
    config.host.includes("gmail.com") || config.user.endsWith("@gmail.com");

  transporter = isGmail
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: config.user,
          pass: config.pass,
        },
      })
    : nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: !config.secure && config.port === 587,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

  return transporter;
}

function getEmailSubject(purpose: VerificationEmailPurpose) {
  return purpose === "registration"
    ? "Verify your Fit Finder account"
    : "Your Fit Finder login verification code";
}

function getEmailHtml(input: SendVerificationEmailInput) {
  const greeting = input.fullName ? `Hi ${input.fullName},` : "Hi,";
  const action =
    input.purpose === "registration"
      ? "Use the code below to verify your email and activate your account."
      : "Use the code below to complete your sign-in.";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>${greeting}</p>
      <p>${action}</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">${input.code}</p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>— Fit Finder</p>
    </div>
  `;
}

function logVerificationCode(input: SendVerificationEmailInput) {
  console.info(
    `[Fit Finder] ${input.purpose} verification code for ${input.to}: ${input.code}`,
  );
}

/** Sends a 6-digit verification code to the user's email via Gmail/SMTP. */
export async function sendVerificationEmail(input: SendVerificationEmailInput) {
  const recipient = input.to.trim().toLowerCase();

  if (isConsoleEmailMode()) {
    logVerificationCode(input);
    return;
  }

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    if (shouldLogVerificationCode()) {
      logVerificationCode(input);
      console.warn(
        "[Fit Finder] SMTP not configured — code logged to terminal. Add a Gmail App Password to SMTP_PASS to deliver email.",
      );
      return;
    }
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const from = process.env.EMAIL_FROM ?? smtpConfig.user;

  if (shouldLogVerificationCode()) {
    logVerificationCode(input);
  }

  try {
    const mailer = getTransporter();
    await mailer.sendMail({
      from,
      to: recipient,
      subject: getEmailSubject(input.purpose),
      html: getEmailHtml(input),
      text: `Your verification code is ${input.code}. It expires in 10 minutes.`,
    });

    console.info(`[Fit Finder] Verification email sent to ${recipient}`);
  } catch (error) {
    console.error("[email-service] Failed to send verification email:", error);
    throw new Error("EMAIL_SEND_FAILED");
  }
}
