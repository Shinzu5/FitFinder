import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

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
    tx: Tx = prisma,
  ) {
    return tx.conversation.findMany(args);
  }

  async createConversation(
    args: Prisma.ConversationCreateArgs,
    tx: Tx = prisma,
  ) {
    return tx.conversation.create(args);
  }

  async deleteConversations(
    args: Prisma.ConversationDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.conversation.deleteMany(args);
  }

  /** Gym conversations with ordered messages + sender summaries. */
  async listByGymWithMessages(gymId: string, tx: Tx = prisma) {
    return tx.conversation.findMany({
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
    tx: Tx = prisma,
  ) {
    return tx.conversation.create({ data: { gymId, type } });
  }

  async deleteConversationsByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.conversation.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── Message ────────────────────────────────────────────────────────────────

  async findMessages(args: Prisma.MessageFindManyArgs, tx: Tx = prisma) {
    return tx.message.findMany(args);
  }

  async createMessage(args: Prisma.MessageCreateArgs, tx: Tx = prisma) {
    return tx.message.create(args);
  }

  async deleteMessages(args: Prisma.MessageDeleteManyArgs, tx: Tx = prisma) {
    return tx.message.deleteMany(args);
  }

  async createGymMessage(
    data: Prisma.MessageCreateArgs["data"],
    tx: Tx = prisma,
  ) {
    return tx.message.create({ data });
  }

  async deleteBySender(senderId: string, tx: Tx = prisma) {
    return tx.message.deleteMany({ where: { senderId } });
  }

  /** Remove messages belonging to conversations of these gyms. */
  async deleteMessagesByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.message.deleteMany({
      where: { conversation: { gymId: { in: gymIds } } },
    });
  }

  // ─── DirectMessage ──────────────────────────────────────────────────────────

  async findDirectMessages(
    args: Prisma.DirectMessageFindManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.directMessage.findMany(args);
  }

  async createDirectMessage(
    args: Prisma.DirectMessageCreateArgs,
    tx: Tx = prisma,
  ) {
    return tx.directMessage.create(args);
  }

  async updateDirectMessages(
    args: Prisma.DirectMessageUpdateManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.directMessage.updateMany(args);
  }

  async deleteDirectMessages(
    args: Prisma.DirectMessageDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.directMessage.deleteMany(args);
  }

  /** Every message sent or received by this user (conversation list). */
  async listForUser(userId: string, tx: Tx = prisma) {
    return tx.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: userSummarySelect },
        receiver: { select: userSummarySelect },
      },
    });
  }

  /** One 1:1 thread, oldest first. */
  async listThread(userId: string, peerId: string, tx: Tx = prisma) {
    return tx.directMessage.findMany({
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
    tx: Tx = prisma,
  ) {
    return tx.directMessage.groupBy({
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
  async markReadFrom(senderId: string, receiverId: string, tx: Tx = prisma) {
    return tx.directMessage.updateMany({
      where: { senderId, receiverId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async createDirect(data: Prisma.DirectMessageCreateArgs["data"], tx: Tx = prisma) {
    return tx.directMessage.create({ data });
  }

  /** Delete every message between two users (thread deletion). */
  async deleteBetween(userId: string, peerId: string, tx: Tx = prisma) {
    return tx.directMessage.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      },
    });
  }

  async deleteByUser(userId: string, tx: Tx = prisma) {
    return tx.directMessage.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    });
  }

  // ─── DirectConversationHide ─────────────────────────────────────────────────

  async findHides(args: Prisma.DirectConversationHideFindManyArgs, tx: Tx = prisma) {
    return tx.directConversationHide.findMany(args);
  }

  async deleteHides(
    args: Prisma.DirectConversationHideDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.directConversationHide.deleteMany(args);
  }

  /** Hidden peer ids for this user (soft-hidden DM threads). */
  async listHiddenPeerIds(userId: string, tx: Tx = prisma) {
    return tx.directConversationHide.findMany({
      where: { userId },
      select: { peerId: true },
    });
  }

  /** Remove the hide rows on both sides of a pair. */
  async unhideBetween(userId: string, peerId: string, tx: Tx = prisma) {
    return tx.directConversationHide.deleteMany({
      where: {
        OR: [
          { userId, peerId },
          { userId: peerId, peerId: userId },
        ],
      },
    });
  }

  async deleteHidesByUser(userId: string, tx: Tx = prisma) {
    return tx.directConversationHide.deleteMany({ where: { userId } });
  }
}
