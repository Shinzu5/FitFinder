import { ClerkRepository } from "@/repositories/clerk.repository";
import { startOfLocalDay } from "@/services/clerk/clerk-date-utils";

const clerkRepository = new ClerkRepository();

/** GET /api/clerk/sales/closing-preview — today's open sales summary. */
export async function GetClosingPreviewService(gymId: string) {
  const startOfDay = startOfLocalDay();
  const openTxns = await clerkRepository.listForClosing(gymId, startOfDay);

  const totalRevenue = openTxns.reduce((sum, txn) => sum + txn.amount, 0);

  return {
    gymId,
    date: startOfDay.toISOString(),
    totalTransactions: openTxns.length,
    totalRevenue,
    canClose: openTxns.length > 0,
    message:
      openTxns.length === 0
        ? "No open transactions to close. Record new payments before closing again."
        : "Ready to close today's open sales.",
  };
}
