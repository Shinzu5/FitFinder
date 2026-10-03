import { MessagingRepository } from "@/repositories/messaging.repository";

const messagingRepository = new MessagingRepository();

/** POST /api/owner/messages — owner-authored message in a gym conversation. */
export async function SendOwnerMessageService(input: {
  senderId: string;
  conversationId: any;
  text: any;
}) {
  return messagingRepository.createGymMessage({
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderRole: "owner",
    text: input.text,
  });
}
