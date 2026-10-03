import { MessagingRepository } from "@/repositories/messaging.repository";

const messagingRepository = new MessagingRepository();

type SendUserMessageResult =
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      message: Awaited<ReturnType<MessagingRepository["createGymMessage"]>>;
      conversationId: unknown;
    };

/**
 * POST /api/user/messages — gymer message in a gym conversation
 * (creates the MEMBER conversation on first use).
 */
export async function SendUserMessageService(input: {
  userId: string;
  conversationId?: any;
  text?: any;
  gymId?: any;
}): Promise<SendUserMessageResult> {
  const { userId, conversationId, text, gymId } = input;

  let convId = conversationId;

  // Create conversation if needed
  if (!convId && gymId) {
    const conv = await messagingRepository.createGymConversation(gymId, "MEMBER");
    convId = conv.id;
  }

  if (!convId) {
    return {
      kind: "error",
      status: 400,
      message: "Conversation ID or gym ID required",
    };
  }

  const message = await messagingRepository.createGymMessage({
    conversationId: convId,
    senderId: userId,
    senderRole: "user",
    text,
  });

  return { kind: "ok", message, conversationId: convId };
}
