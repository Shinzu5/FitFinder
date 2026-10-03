import { MessagingRepository } from "@/repositories/messaging.repository";
import { getIO, userRoom } from "@/socket";

const messagingRepository = new MessagingRepository();

type DeleteConversationResult =
  | { kind: "invalid" }
  | { kind: "ok"; peerId: string };

/**
 * DELETE /api/messages/conversations/:userId — permanently delete the thread
 * for both sides (messages + hide rows in one atomic unit) and notify them.
 */
export async function DeleteConversationService(opts: {
  userId: string;
  peerId: string;
}): Promise<DeleteConversationResult> {
  const { userId, peerId } = opts;

  if (!peerId || peerId === userId) {
    return { kind: "invalid" };
  }

  await messagingRepository.deleteThreadBetween(userId, peerId);

  try {
    const io = getIO();
    const payload = { peerId, deletedBy: userId };
    io.to(userRoom(userId)).emit("conversation_deleted", { peerId, deletedBy: userId });
    // Peer should drop the same thread — messages are gone for both.
    io.to(userRoom(peerId)).emit("conversation_deleted", {
      peerId: userId,
      deletedBy: userId,
    });
    // Keep legacy event for any older listeners
    io.to(userRoom(userId)).emit("conversation_hidden", payload);
  } catch {
    // ignore
  }

  return { kind: "ok", peerId };
}
