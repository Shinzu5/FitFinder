import { ClerkRepository } from "@/repositories/clerk.repository";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";
import { FRONTEND_TO_TXN_TYPE } from "@/services/clerk/txn-type-utils";

const clerkRepository = new ClerkRepository();

type UpdatePaymentResult =
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      txn: Awaited<ReturnType<ClerkRepository["updateTransactionRow"]>>;
    };

/**
 * PUT /api/clerk/transactions/:id — edit an open (not-yet-closed) payment.
 * Guard first, then per-field validation in payload order.
 */
export async function UpdatePaymentService(input: {
  gymId: string;
  paymentId: string;
  body: any;
}): Promise<UpdatePaymentResult> {
  const { gymId, paymentId, body } = input;

  const existing = await clerkRepository.findOpenByIdAndGym(paymentId, gymId);
  if (!existing) {
    return { kind: "error", status: 404, message: "Open payment not found" };
  }

  const data: {
    memberName?: string;
    amount?: number;
    method?: "CASH" | "CASHLESS";
    notes?: string;
    type?: "MONTHLY" | "SESSION" | "SUPPLEMENTS" | "DAY_PASS" | "RENEWAL" | "COACH";
  } = {};

  if (body.member !== undefined) {
    data.memberName = String(body.member || "Guest").trim() || "Guest";
  }
  if (body.notes !== undefined) {
    data.notes = String(body.notes || "").trim();
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return { kind: "error", status: 400, message: "Amount must be greater than 0" };
    }
    data.amount = amount;
  }
  if (body.method !== undefined) {
    data.method = body.method === "cash" ? "CASH" : "CASHLESS";
  }
  if (body.type !== undefined) {
    const mappedType = FRONTEND_TO_TXN_TYPE[String(body.type || "")];
    if (!mappedType) {
      return { kind: "error", status: 400, message: "Invalid transaction type" };
    }
    data.type = mappedType;
  }

  const txn = await clerkRepository.updateTransactionRow(existing.id, data);

  void emitSalesUpdated(gymId);

  return { kind: "ok", txn };
}
