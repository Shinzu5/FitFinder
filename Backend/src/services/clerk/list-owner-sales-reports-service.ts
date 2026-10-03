import { ClerkRepository } from "@/repositories/clerk.repository";

const clerkRepository = new ClerkRepository();

/**
 * GET /api/owner/sales-reports — daily closing reports for the owner's gym,
 * optionally filtered by clerk search and/or YYYY-MM-DD report date.
 */
export async function ListOwnerSalesReportsService(input: {
  gymId: string;
  search?: unknown;
  date?: unknown;
}) {
  const search = typeof input.search === "string" ? input.search.trim() : "";
  const dateFilter = typeof input.date === "string" ? input.date.trim() : "";

  const where: any = { gymId: input.gymId };

  if (dateFilter) {
    // Expect YYYY-MM-DD
    const parts = dateFilter.split("-").map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      const [y, m, d] = parts;
      where.reportDate = new Date(Date.UTC(y, m - 1, d));
    }
  }

  if (search) {
    where.clerk = {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  return clerkRepository.listByGymWithClerk(where);
}
