import { ClerkRepository } from "@/repositories/clerk.repository";

const clerkRepository = new ClerkRepository();

/** GET /api/owner/sales-reports/:id — report receipt, private to this gym. */
export async function GetOwnerSalesReportReceiptService(input: {
  gymId: string;
  reportId: string;
}) {
  return clerkRepository.findReceiptByIdAndGym(input.reportId, input.gymId);
}
