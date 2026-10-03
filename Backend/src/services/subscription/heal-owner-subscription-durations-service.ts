import { SubscriptionRepository } from "@/repositories/subscription.repository";
import { addOwnerPlanDays, storedDurationToDays } from "@/utils/ownerPlan";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";

const subscriptionRepository = new SubscriptionRepository();

/** Fix stacked validUntil so each row is paidAt + plan duration days. */
export async function HealOwnerSubscriptionDurationsService(): Promise<number> {
  const rows = await subscriptionRepository.listForDurationHeal();
  let fixed = 0;
  for (const row of rows) {
    const days = storedDurationToDays(row.months);
    const correct = addOwnerPlanDays(row.paidAt, days);
    if (Math.abs(correct.getTime() - row.validUntil.getTime()) > 1000) {
      await subscriptionRepository.updateValidUntil(row.id, correct);
      fixed += 1;
    }
  }
  if (fixed > 0) void emitAdminGymsUpdated();
  return fixed;
}
