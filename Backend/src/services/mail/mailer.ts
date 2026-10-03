import nodemailer, { Transporter } from "nodemailer";
import { ENV } from "@/config/env";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

let transporter: Transporter | null = null;

function buildTransporter(): Transporter {
  if (!ENV.SMTP.HOST || !ENV.SMTP.PORT) {
    throw new Error("SMTP_HOST and SMTP_PORT must be configured");
  }

  if (!ENV.SMTP.USER || !ENV.SMTP.PASS) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured");
  }

  return nodemailer.createTransport({
    host: ENV.SMTP.HOST,
    port: Number(ENV.SMTP.PORT),
    secure: ENV.SMTP.SECURE,
    auth: {
      user: ENV.SMTP.USER,
      pass: ENV.SMTP.PASS,
    },
  });
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = buildTransporter();
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!ENV.SMTP.FROM || !ENV.APP_NAME) {
    throw new Error("SMTP_FROM / APP_NAME must be configured");
  }

  await getTransporter().sendMail({
    from: `"${ENV.APP_NAME}" <${ENV.SMTP.FROM}>`,
    to,
    subject,
    html,
  });
}
