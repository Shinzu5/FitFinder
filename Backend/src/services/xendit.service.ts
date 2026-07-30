import { env } from "../config/env";

const XENDIT_API_URL = "https://api.xendit.co";

// Base64 encode the secret key for Basic Auth
function getAuthHeader(): string {
  const encoded = Buffer.from(`${env.XENDIT_SECRET_KEY}:`).toString("base64");
  return `Basic ${encoded}`;
}

export interface CreateGcashPaymentParams {
  referenceId: string;
  amount: number;
  description: string;
  successReturnUrl: string;
  failureReturnUrl: string;
  metadata?: Record<string, unknown>;
}

export interface XenditPaymentResponse {
  id: string;
  reference_id: string;
  status: string;
  amount: number;
  currency: string;
  actions?: Array<{
    action: string;
    url: string;
    url_type: string;
  }>;
}

/**
 * Create a GCash payment via Xendit Payment Requests API.
 * Returns the payment ID and redirect URL for the user.
 */
export async function createGcashPayment(
  params: CreateGcashPaymentParams
): Promise<{ paymentId: string; redirectUrl: string; status: string }> {
  const body = {
    reference_id: params.referenceId,
    currency: "PHP",
    amount: params.amount,
    payment_method: {
      type: "EWALLET",
      reusability: "ONE_TIME_USE",
      ewallet: {
        channel_code: "GCASH",
        channel_properties: {
          success_return_url: params.successReturnUrl,
          failure_return_url: params.failureReturnUrl,
        }
      }
    },
    metadata: params.metadata || {},
    description: params.description,
  };

  const response = await fetch(`${XENDIT_API_URL}/payment_requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Xendit API error:", response.status, errorData);
    throw new Error(
      `Xendit API error: ${response.status} — ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as XenditPaymentResponse;

  // Find the redirect URL from the actions array
  const redirectAction = data.actions?.find(
    (action) => action.action === "AUTH" || action.action === "REDIRECT_CUSTOMER"
  );

  if (!redirectAction?.url) {
    throw new Error("No redirect URL returned from Xendit");
  }

  return {
    paymentId: data.id,
    redirectUrl: redirectAction.url,
    status: data.status,
  };
}

/**
 * Get the status of a Xendit payment by its payment request ID.
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<{ status: string; amount: number; paidAt: string | null }> {
  const response = await fetch(
    `${XENDIT_API_URL}/payment_requests/${paymentId}`,
    {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Xendit status check failed: ${response.status} — ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as { status: string; amount: number; updated?: string; created?: string };

  return {
    status: data.status,
    amount: data.amount,
    paidAt: data.updated || data.created || null,
  };
}

/**
 * Verify the webhook callback token from Xendit.
 * Xendit sends a `x-callback-token` header that must match your configured token.
 */
export function verifyWebhookToken(callbackToken: string): boolean {
  if (!env.XENDIT_WEBHOOK_TOKEN) {
    console.warn("XENDIT_WEBHOOK_TOKEN not configured — skipping verification");
    return true; // Allow in dev if not configured
  }
  return callbackToken === env.XENDIT_WEBHOOK_TOKEN;
}
