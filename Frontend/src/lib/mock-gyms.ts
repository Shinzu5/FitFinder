export type GymStatus = "ACTIVE" | "PENDING";

/** Shared gym list card shape — populated from Neon `/gyms`, not mock arrays. */
export interface Gym {
  id: string;
  name: string;
  location: string;
  description: string;
  hours: string;
  website: string;
  members: number;
  /** Lowest active plan price from Neon; null when no active plans */
  pricePerMonth: number | null;
  hasActivePlans?: boolean;
  image: string;
  status?: GymStatus;
}

/** Empty — browse uses Neon only. Kept so legacy imports do not break. */
export const mockGyms: Gym[] = [];
