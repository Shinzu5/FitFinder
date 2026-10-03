import { MessagingRepository } from "@/repositories/messaging.repository";
import { getIO, userRoom } from "@/socket";

const messagingRepository = new MessagingRepository();

/**
 * POST /api/messages/thread/:userId/read — mark inbound messages read
 * and tell both sides how many were cleared.
 */
export async function MarkThreadReadService(opts: {
  userId: string;
  peerId: string;
}) {
  const result = await messagingRepository.markReadFrom(opts.peerId, opts.userId);

  try {
    getIO().to(userRoom(opts.userId)).emit("messages_read", {
      peerId: opts.peerId,
      count: result.count,
    });
  } catch {
    // ignore
  }

  return { updated: result.count };
}
