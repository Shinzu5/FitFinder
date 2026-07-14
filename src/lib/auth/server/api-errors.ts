import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/lib/auth/types";

export function jsonError(
  message: string,
  status: number,
  extra?: Pick<ApiErrorResponse, "code" | "retryAfterSeconds">,
) {
  return NextResponse.json<ApiErrorResponse>(
    { error: message, ...extra },
    { status },
  );
}

export function mapVerificationError(error: unknown) {
  if (!(error instanceof Error)) {
    return jsonError("Unable to verify code. Please try again.", 400);
  }

  if (error.message.startsWith("COOLDOWN:")) {
    const retryAfterSeconds = Number(error.message.split(":")[1] ?? RESEND_COOLDOWN_FALLBACK);
    return jsonError(
      `Please wait ${retryAfterSeconds} seconds before requesting a new code.`,
      429,
      { code: "COOLDOWN", retryAfterSeconds },
    );
  }

  switch (error.message) {
    case "INVALID":
      return jsonError("No active verification code found. Request a new code.", 400, {
        code: "INVALID",
      });
    case "EXPIRED":
      return jsonError("This verification code has expired. Request a new code.", 400, {
        code: "EXPIRED",
      });
    case "INCORRECT":
      return jsonError("The verification code is incorrect. Please try again.", 400, {
        code: "INCORRECT",
      });
    default:
      return jsonError("Unable to verify code. Please try again.", 500);
  }
}

const RESEND_COOLDOWN_FALLBACK = 60;

export function mapEmailSendError(error: unknown) {
  if (!(error instanceof Error)) {
    return jsonError("Unable to send verification email. Please try again.", 500, {
      code: "EMAIL_SEND_FAILED",
    });
  }

  if (error.message === "EMAIL_NOT_CONFIGURED") {
    return jsonError(
      "Email delivery is not configured on the server. Contact support or enable development email mode.",
      500,
      { code: "EMAIL_NOT_CONFIGURED" },
    );
  }

  if (error.message === "EMAIL_SEND_FAILED") {
    return jsonError(
      "We could not send the verification email. Check your SMTP settings and use a Gmail App Password if you use Gmail.",
      500,
      { code: "EMAIL_SEND_FAILED" },
    );
  }

  return jsonError("Unable to send verification email. Please try again.", 500, {
    code: "EMAIL_SEND_FAILED",
  });
}
