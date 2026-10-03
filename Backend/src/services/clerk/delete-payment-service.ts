import { ClerkRepository } from "@/repositories/clerk.repository";
import { EmitSalesUpdatedService as emitSalesUpdated } from "@/services/realtime/emit-sales-updated-service";

const clerkRepository = new ClerkRepository();

type DeletePaymentResult =
  | { kind: "error"; status: number; message: string }
  | { kind: "ok"; id: string };

/** DELETE /api/clerk/transactions/:id — remove an open payment. */
export async function DeletePaymentService(input: {
  gymId: string;
  paymentId: string;
}): Promise<DeletePaymentResult> {
  const { gymId, paymentId } = input;

  const existing = await clerkRepository.findOpenIdByIdAndGym(paymentId, gymId);
  if (!existing) {
    return { kind: "error", status: 404, message: "Open payment not found" };
  }

  await clerkRepository.deleteTransactionById(existing.id);

  void emitSalesUpdated(gymId);

  return { kind: "ok", id: existing.id };
}
