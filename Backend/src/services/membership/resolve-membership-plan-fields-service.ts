/** Prefer stored purchase snapshot; fall back to live plan relation if needed. */
export function ResolveMembershipPlanFieldsService(m: {
  planName?: string | null;
  planPrice?: number | null;
  durationDays?: number | null;
  plan?: { name: string; price: number; durationDays: number } | null;
}) {
  return {
    planName: (m.planName && m.planName.trim()) || m.plan?.name || "",
    planPrice: m.planPrice && m.planPrice > 0 ? m.planPrice : m.plan?.price ?? 0,
    durationDays:
      m.durationDays && m.durationDays > 0
        ? m.durationDays
        : m.plan?.durationDays ?? 0,
  };
}
