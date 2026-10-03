export function MembershipPlanSnapshotService(plan: {
  name: string;
  price: number;
  durationDays: number;
}) {
  return {
    planName: plan.name,
    planPrice: plan.price,
    durationDays: plan.durationDays,
  };
}
