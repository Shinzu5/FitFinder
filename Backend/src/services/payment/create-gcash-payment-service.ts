import { XENDIT_API_URL } from "@/services/payment/xendit-api-url";
import { GetAuthHeaderService as getAuthHeader } from "@/services/payment/get-auth-header-service";

interface CreateGcashPaymentParams {
  referenceId: string;
  amount: number;
  description: string;
  successReturnUrl: string;
  failureReturnUrl: string;
  metadata?: Record<string, unknown>;
  /** Gym-owned Xendit secret for MEMBERSHIP payments; omit for platform SUBSCRIPTION */
  apiKey?: string;
}

interface XenditPaymentResponse {
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
export async function CreateGcashPaymentService(
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
      Authorization: getAuthHeader(params.apiKey),
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
