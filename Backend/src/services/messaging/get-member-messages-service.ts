import { MessagingRepository } from "@/repositories/messaging.repository";
import { ResolveActiveGymService as resolveActiveGymId } from "@/services/gym/resolve-active-gym-service";

const messagingRepository = new MessagingRepository();

/** GET /api/user/messages — gym conversations for the gymer's selected gym. */
export async function GetMemberMessagesService(userId: string) {
  const gymId = await resolveActiveGymId(userId);

  if (!gymId) {
    return [];
  }

  return messagingRepository.listByGymWithMessages(gymId);
}
