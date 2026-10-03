import { GymRepository } from "@/repositories/gym.repository";
import { MessagingRepository } from "@/repositories/messaging.repository";

const gymRepository = new GymRepository();
const messagingRepository = new MessagingRepository();

type ConversationRow = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  lastMessage: string;
  lastMessageAt: string;
  lastSenderId: string;
  unreadCount: number;
  gymName: string | null;
};

/**
 * GET /api/messages/conversations — inbox rows: latest message per peer,
 * hidden threads skipped, unread badges + owner gym names filled in.
 */
export async function GetConversationsService(userId: string) {
  const [messages, hides] = await Promise.all([
    messagingRepository.listForUser(userId),
    messagingRepository.listHiddenPeerIds(userId),
  ]);

  const hiddenPeers = new Set(hides.map((h) => h.peerId));
  const seen = new Set<string>();
  const conversations: ConversationRow[] = [];

  const peerIds: string[] = [];
  for (const message of messages) {
    const otherUser = message.senderId === userId ? message.receiver : message.sender;
    if (hiddenPeers.has(otherUser.id) || seen.has(otherUser.id)) continue;
    seen.add(otherUser.id);
    peerIds.push(otherUser.id);
    conversations.push({
      user: otherUser,
      lastMessage: message.text,
      lastMessageAt: message.createdAt.toISOString(),
      lastSenderId: message.senderId,
      unreadCount: 0,
      gymName: null,
    });
  }

  if (peerIds.length > 0) {
    const [unreadGroups, ownerGyms] = await Promise.all([
      messagingRepository.countUnreadGroupedBySender(userId, peerIds),
      gymRepository.findActiveByOwnerIds(peerIds),
    ]);

    const unreadBySender = new Map(
      unreadGroups.map((g) => [g.senderId, g._count._all]),
    );
    const gymByOwner = new Map<string, string>();
    for (const g of ownerGyms) {
      if (!gymByOwner.has(g.ownerId)) gymByOwner.set(g.ownerId, g.name);
    }

    for (const conv of conversations) {
      conv.unreadCount = unreadBySender.get(conv.user.id) || 0;
      conv.gymName = gymByOwner.get(conv.user.id) || null;
    }
  }

  return conversations;
}
