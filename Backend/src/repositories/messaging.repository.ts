import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/config/database";

const userSummarySelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  avatarUrl: true,
} as const;

/**
 * Conversation / Message (gym chat) + DirectMessage / DirectConversationHide
 * (cross-role inbox). 1:1 with messaging.controller, user/owner controllers and
 * account removal.
 */
export class MessagingRepository {
  // ─── Conversation ───────────────────────────────────────────────────────────

  async findConversations(
    args: Prisma.ConversationFindManyArgs,
  ) {
    return prisma.conversation.findMany(args);
  }

  async createConversation(
    args: Prisma.ConversationCreateArgs,
  ) {
    return prisma.conversation.create(args);
  }

  async deleteConversations(
    args: Prisma.ConversationDeleteManyArgs,
  ) {
    return prisma.conversation.deleteMany(args);
  }

  /** Gym conversations with ordered messages + sender summaries. */
  async listByGymWithMessages(gymId: string) {
    return prisma.conversation.findMany({
      where: { gymId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
  }

  async createGymConversation(
    gymId: string,
    type: string,
  ) {
    return prisma.conversation.create({ data: { gymId, type } });
  }

  async deleteConversationsByGymIds(gymIds: string[]) {
    return prisma.conversation.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── Message ────────────────────────────────────────────────────────────────

  async findMessages(args: Prisma.MessageFindManyArgs) {
    return prisma.message.findMany(args);
  }

  async createMessage(args: Prisma.MessageCreateArgs) {
    return prisma.message.create(args);
  }

  async deleteMessages(args: Prisma.MessageDeleteManyArgs) {
    return prisma.message.deleteMany(args);
  }

  async createGymMessage(
    data: Prisma.MessageCreateArgs["data"],
  ) {
    return prisma.message.create({ data });
  }

  async deleteBySender(senderId: string) {
    return prisma.message.deleteMany({ where: { senderId } });
  }

  /** Remove messages belonging to conversations of these gyms. */
  async deleteMessagesByGymIds(gymIds: string[]) {
    return prisma.message.deleteMany({
      where: { conversation: { gymId: { in: gymIds } } },
    });
  }

  // ─── DirectMessage ──────────────────────────────────────────────────────────

  async findDirectMessages(
    args: Prisma.DirectMessageFindManyArgs,
  ) {
    return prisma.directMessage.findMany(args);
  }

  async createDirectMessage(
    args: Prisma.DirectMessageCreateArgs,
  ) {
    return prisma.directMessage.create(args);
  }

  async updateDirectMessages(
    args: Prisma.DirectMessageUpdateManyArgs,
  ) {
    return prisma.directMessage.updateMany(args);
  }

  async deleteDirectMessages(
    args: Prisma.DirectMessageDeleteManyArgs,
  ) {
    return prisma.directMessage.deleteMany(args);
  }

  /** Every message sent or received by this user (conversation list). */
  async listForUser(userId: string) {
    return prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: userSummarySelect },
        receiver: { select: userSummarySelect },
      },
    });
  }

  /** One 1:1 thread, oldest first. */
  async listThread(userId: string, peerId: string) {
    return prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Unread counts per sender for this receiver (conversation badges). */
  async countUnreadGroupedBySender(
    receiverId: string,
    senderIds: string[],
  ) {
    return prisma.directMessage.groupBy({
      by: ["senderId"],
      where: {
        receiverId,
        senderId: { in: senderIds },
        readAt: null,
      },
      _count: { _all: true },
    });
  }

  /** Mark inbound messages from a peer as read. */
  async markReadFrom(senderId: string, receiverId: string) {
    return prisma.directMessage.updateMany({
      where: { senderId, receiverId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async createDirect(data: Prisma.DirectMessageCreateArgs["data"]) {
    return prisma.directMessage.create({ data });
  }

  /** Delete every message between two users (thread deletion). */
  async deleteBetween(userId: string, peerId: string) {
    return prisma.directMessage.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      },
    });
  }

  async deleteByUser(userId: string) {
    return prisma.directMessage.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    });
  }

  // ─── DirectConversationHide ─────────────────────────────────────────────────

  async findHides(args: Prisma.DirectConversationHideFindManyArgs) {
    return prisma.directConversationHide.findMany(args);
  }

  async deleteHides(
    args: Prisma.DirectConversationHideDeleteManyArgs,
  ) {
    return prisma.directConversationHide.deleteMany(args);
  }

  /** Hidden peer ids for this user (soft-hidden DM threads). */
  async listHiddenPeerIds(userId: string) {
    return prisma.directConversationHide.findMany({
      where: { userId },
      select: { peerId: true },
    });
  }

  /** Remove the hide rows on both sides of a pair. */
  async unhideBetween(userId: string, peerId: string) {
    return prisma.directConversationHide.deleteMany({
      where: {
        OR: [
          { userId, peerId },
          { userId: peerId, peerId: userId },
        ],
      },
    });
  }

  async deleteHidesByUser(userId: string) {
    return prisma.directConversationHide.deleteMany({ where: { userId } });
  }

  // ─── Multi-write atomic units (former controller $transaction blocks) ──────

  /**
   * Unhide the thread for BOTH sides, insert the message and re-read the
   * sender summary in ONE atomic unit (was prisma.$transaction in
   * messaging.controller sendDirectMessage).
   * New activity brings the conversation back for both participants.
   */
  async sendDirectMessageWithUnhide(args: {
    senderId: string;
    receiverId: string;
    senderRole: UserRole;
    receiverRole: UserRole;
    text: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // New activity brings the thread back for both participants
      await tx.directConversationHide.deleteMany({
        where: {
          OR: [
            { userId: args.senderId, peerId: args.receiverId },
            { userId: args.receiverId, peerId: args.senderId },
          ],
        },
      });

      const message = await tx.directMessage.create({
        data: {
          senderId: args.senderId,
          receiverId: args.receiverId,
          senderRole: args.senderRole,
          receiverRole: args.receiverRole,
          text: args.text,
        },
      });

      const sender = await tx.user.findUnique({
        where: { id: args.senderId },
        select: userSummarySelect,
      });

      return { message, sender };
    });
  }

  /**
   * Permanently delete a thread for BOTH sides: drop every message between the
   * pair and both hide rows in ONE atomic unit (was prisma.$transaction([...])
   * in messaging.controller hideConversation).
   */
  async deleteThreadBetween(userId: string, peerId: string) {
    return prisma.$transaction([
      prisma.directMessage.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: peerId },
            { senderId: peerId, receiverId: userId },
          ],
        },
      }),
      prisma.directConversationHide.deleteMany({
        where: {
          OR: [
            { userId, peerId },
            { userId: peerId, peerId: userId },
          ],
        },
      }),
    ]);
  }
}
