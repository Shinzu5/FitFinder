import { getOwnerPlanById, resolveOwnerPlanFromMetadata } from "@/config/ownerPlans";
import { storedDurationToDays } from "@/utils/ownerPlan";

export function PlanInfoFromPaymentMetadataService(metadata: unknown, amount: number) {
  const meta = (metadata || {}) as Record<string, unknown>;
  const catalog = resolveOwnerPlanFromMetadata(meta) || getOwnerPlanById(String(meta.planId || ""));
  const durationDays = catalog
    ? catalog.days
    : storedDurationToDays(Number(meta.days ?? meta.durationDays ?? meta.months) || 30);

  return {
    planId: catalog?.id || String(meta.planId || ""),
    planName: catalog?.name || String(meta.planName || "Plan"),
    /** Catalog price when known; otherwise the charged amount */
    catalogPrice: catalog?.price ?? amount,
    durationDays,
    chargedAmount: amount,
  };
}
