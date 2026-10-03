import { env } from "@/config/env";

/**
 * Verify the webhook callback token from Xendit.
 * Xendit sends a `x-callback-token` header that must match your configured token.
 */
export function VerifyWebhookTokenService(callbackToken: string): boolean {
  if (!env.XENDIT_WEBHOOK_TOKEN) {
    console.warn("XENDIT_WEBHOOK_TOKEN not configured — skipping verification");
    return true; // Allow in dev if not configured
  }
  return callbackToken === env.XENDIT_WEBHOOK_TOKEN;
}
