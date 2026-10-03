import { ClerkRepository } from "@/repositories/clerk.repository";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { FRONTEND_TO_TXN_TYPE } from "@/services/clerk/txn-type-utils";

const clerkRepository = new ClerkRepository();

type RecordPaymentResult =
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      txn: Awaited<ReturnType<ClerkRepository["createTransactionRow"]>>;
    };

/** POST /api/clerk/transactions — log a front-desk payment. */
export async function RecordPaymentService(input: {
  gymId: string;
  clerkId: string;
  body: any;
}): Promise<RecordPaymentResult> {
  const { gymId, clerkId, body } = input;

  const mappedType = FRONTEND_TO_TXN_TYPE[String(body.type || "")];
  if (!mappedType) {
    return { kind: "error", status: 400, message: "Invalid transaction type" };
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return { kind: "error", status: 400, message: "Amount must be greater than 0" };
  }

  const txn = await clerkRepository.createTransactionRow({
    gymId,
    clerkId,
    type: mappedType,
    memberName: body.member || "Guest",
    amount,
    method: body.method === "cash" ? "CASH" : "CASHLESS",
    // Free-text Notes drive Today's Log title on the client
    notes: String(body.notes || "").trim(),
  });

  void emitSalesUpdated(gymId);

  return { kind: "ok", txn };
}
