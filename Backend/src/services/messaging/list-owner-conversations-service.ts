import { MessagingRepository } from "@/repositories/messaging.repository";

const messagingRepository = new MessagingRepository();

/** GET /api/owner/messages — gym conversations with every message. */
export async function ListOwnerConversationsService(gymId: string) {
  return messagingRepository.listByGymWithMessages(gymId);
}
