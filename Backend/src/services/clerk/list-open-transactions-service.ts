import { ClerkRepository } from "@/repositories/clerk.repository";
import { startOfLocalDay } from "@/services/clerk/clerk-date-utils";

const clerkRepository = new ClerkRepository();

/** GET /api/clerk/transactions — open (not-yet-closed) payments, newest first. */
export async function ListOpenTransactionsService(gymId: string) {
  return clerkRepository.listOpenToday(gymId, startOfLocalDay());
}
