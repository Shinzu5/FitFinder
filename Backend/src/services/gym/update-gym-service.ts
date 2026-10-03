import { GymRepository } from "@/repositories/gym.repository";

const gymRepository = new GymRepository();

type UpdateGymResult =
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "ok"; gym: Awaited<ReturnType<GymRepository["updateGym"]>> };

/**
 * PUT /api/gyms/:id — owner/admin profile update.
 * `data` is already mapped to Prisma columns by the controller.
 */
export async function UpdateGymService(opts: {
  gymId: string;
  actorId: string;
  actorRole?: string;
  data: Record<string, unknown>;
}): Promise<UpdateGymResult> {
  const gym = await gymRepository.findById(opts.gymId);

  if (!gym) {
    return { kind: "not-found" };
  }

  if (gym.ownerId !== opts.actorId && opts.actorRole !== "ADMIN") {
    return { kind: "forbidden" };
  }

  const updated = await gymRepository.updateGym(opts.gymId, opts.data);

  return { kind: "ok", gym: updated };
}
