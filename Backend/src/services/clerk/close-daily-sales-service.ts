import { ClerkRepository } from "@/repositories/clerk.repository";
import { UserRepository } from "@/repositories/user.repository";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { reportDateOnly, startOfLocalDay } from "@/services/clerk/clerk-date-utils";

const clerkRepository = new ClerkRepository();
const userRepository = new UserRepository();

type CloseDailySalesResult =
  | { kind: "empty" }
  | {
      kind: "ok";
      report: Awaited<ReturnType<ClerkRepository["closeDailySalesForGym"]>>;
      openTxns: Awaited<ReturnType<ClerkRepository["listForClosing"]>>;
      closedByRole: "OWNER" | "CLERK";
      actorFullName: string | null;
    };

/**
 * POST /api/clerk/sales/close — create the daily report and attach every open
 * transaction in ONE atomic unit.
 */
export async function CloseDailySalesService(input: {
  gymId: string;
  clerkId: string;
}): Promise<CloseDailySalesResult> {
  const { gymId, clerkId } = input;

  const actor = await userRepository.findRoleAndFullNameById(clerkId);
  const closedByRole = actor?.role === "OWNER" ? ("OWNER" as const) : ("CLERK" as const);

  const startOfDay = startOfLocalDay();
  const openTxns = await clerkRepository.listForClosing(gymId, startOfDay);

  if (openTxns.length === 0) {
    return { kind: "empty" };
  }

  const totalRevenue = openTxns.reduce((sum, txn) => sum + txn.amount, 0);
  const txnIds = openTxns.map((txn) => txn.id);

  const report = await clerkRepository.closeDailySalesForGym({
    gymId,
    clerkId,
    closedByRole,
    reportDate: reportDateOnly(),
    totalTransactions: openTxns.length,
    totalRevenue,
    txnIds,
  });

  void emitSalesUpdated(gymId);

  return { kind: "ok", report, openTxns, closedByRole, actorFullName: actor?.fullName ?? null };
}
