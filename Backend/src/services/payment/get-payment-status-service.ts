import { XENDIT_API_URL } from "@/services/payment/xendit-api-url";
import { GetAuthHeaderService as getAuthHeader } from "@/services/payment/get-auth-header-service";

/**
 * Get the status of a Xendit payment by its payment request ID.
 */
export async function GetPaymentStatusService(
  paymentId: string,
  apiKey?: string
): Promise<{ status: string; amount: number; paidAt: string | null }> {
  const response = await fetch(
    `${XENDIT_API_URL}/payment_requests/${paymentId}`,
    {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(apiKey),
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
