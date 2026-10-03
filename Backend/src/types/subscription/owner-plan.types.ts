export type OwnerPlanId = "starter" | "standard" | "popular";

export interface OwnerPlanDefinition {
  id: OwnerPlanId;
  name: string;
  price: number;
  /** Access duration in whole days */
  days: number;
}
