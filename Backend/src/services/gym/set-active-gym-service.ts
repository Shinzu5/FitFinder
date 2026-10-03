import { UserRepository } from "@/repositories/user.repository";
import { ListLiveMembershipsService } from "@/services/gym/list-live-memberships-service";
import { emitToUser } from "@/socket";

const userRepository = new UserRepository();

/** Set active gym if the user has a live membership there. */
export async function SetActiveGymService(
  userId: string,
  gymId: string,
): Promise<{ ok: true; gymId: string } | { ok: false; status: number; message: string }> {
  const live = await ListLiveMembershipsService(userId);
  const match = live.find((m) => m.gymId === gymId);
  if (!match) {
    return {
      ok: false,
      status: 400,
      message: "You do not have an active membership at this gym",
    };
  }

  await userRepository.setActiveGym(userId, gymId);

  emitToUser(userId, "active_gym_changed", { gymId });
  emitToUser(userId, "membership_updated", {});
  return { ok: true, gymId };
}
