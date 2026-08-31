import { Response } from "express";
import { UserRole } from "@prisma/client";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { canMessage } from "../utils/messagingRules";
import { getIO, userRoom } from "../socket";
import { createNotification } from "../services/notification.service";

const userSummarySelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  avatarUrl: true,
} as const;

function serializeDirectMessage(message: {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: Date | string;
}) {
  return {
    id: String(message.id),
    senderId: String(message.senderId),
    receiverId: String(message.receiverId),
    text: message.text,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : String(message.createdAt),
  };
}

function emitReceiveMessage(payload: {
  message: {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: Date | string;
  };
  sender: unknown;
  toUserIds: string[];
}) {
  try {
    const io = getIO();
    const message = serializeDirectMessage(payload.message);
    for (const id of payload.toUserIds) {
      io.to(userRoom(String(id))).emit("receive_message", {
        message,
        sender: payload.sender,
      });
    }
  } catch (socketError) {
    console.error("Socket emit failed:", socketError);
  }
}

async function unhideConversation(userId: string, peerId: string) {
  await prisma.directConversationHide.deleteMany({
    where: {
      OR: [
        { userId, peerId },
        { userId: peerId, peerId: userId },
      ],
    },
  });
}

// GET /api/messages/search?q=...
export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string | undefined)?.trim() || "";
    if (!query) {
      sendSuccess(res, []);
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.userId! },
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: userSummarySelect,
      take: 20,
      orderBy: { fullName: "asc" },
    });

    const messagable = users.filter((user) => canMessage(req.userRole!, user.role));
    sendSuccess(res, messagable);
  } catch (error) {
    console.error("Search users error:", error);
    sendError(res, "Failed to search users", 500);
  }
}

// GET /api/messages/conversations
export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const [messages, hides] = await Promise.all([
      prisma.directMessage.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: userSummarySelect },
          receiver: { select: userSummarySelect },
        },
      }),
      prisma.directConversationHide.findMany({
        where: { userId },
        select: { peerId: true },
      }),
    ]);

    const hiddenPeers = new Set(hides.map((h) => h.peerId));
    const seen = new Set<string>();
    const conversations: Array<{
      user: (typeof messages)[number]["sender"];
      lastMessage: string;
      lastMessageAt: string;
      lastSenderId: string;
      unreadCount: number;
      gymName: string | null;
    }> = [];

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
        prisma.directMessage.groupBy({
          by: ["senderId"],
          where: {
            receiverId: userId,
            senderId: { in: peerIds },
            readAt: null,
          },
          _count: { _all: true },
        }),
        prisma.gym.findMany({
          where: { ownerId: { in: peerIds }, status: "ACTIVE" },
          select: { ownerId: true, name: true },
          orderBy: { createdAt: "desc" },
        }),
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

    sendSuccess(res, conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    sendError(res, "Failed to fetch conversations", 500);
  }
}

// GET /api/messages/thread/:userId
export async function getThread(req: AuthRequest, res: Response): Promise<void> {
  try {
    const otherUserId = req.params.userId as string;
    const userId = req.userId!;

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: userSummarySelect,
    });

    if (!otherUser) {
      sendError(res, "User not found", 404);
      return;
    }

    if (!canMessage(req.userRole!, otherUser.role)) {
      sendError(res, "You are not allowed to view this conversation", 403);
      return;
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Opening a thread marks inbound messages as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const gym =
      otherUser.role === "OWNER"
        ? await prisma.gym.findFirst({
            where: { ownerId: otherUserId, status: "ACTIVE" },
            select: { name: true },
            orderBy: { createdAt: "desc" },
          })
        : null;

    sendSuccess(res, {
      user: otherUser,
      gymName: gym?.name || null,
      messages,
    });
  } catch (error) {
    console.error("Get thread error:", error);
    sendError(res, "Failed to fetch conversation", 500);
  }
}

// POST /api/messages/thread/:userId/read
export async function markThreadRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const otherUserId = req.params.userId as string;
    const userId = req.userId!;

    const result = await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    try {
      getIO().to(userRoom(userId)).emit("messages_read", {
        peerId: otherUserId,
        count: result.count,
      });
    } catch {
      // ignore
    }

    sendSuccess(res, { updated: result.count });
  } catch (error) {
    console.error("Mark thread read error:", error);
    sendError(res, "Failed to mark messages as read", 500);
  }
}

// DELETE /api/messages/conversations/:userId — permanently delete the thread for both sides
export async function hideConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const peerId = req.params.userId as string;
    const userId = req.userId!;

    if (!peerId || peerId === userId) {
      sendError(res, "Invalid conversation");
      return;
    }

    await prisma.$transaction([
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

    sendSuccess(res, { peerId }, "Conversation permanently deleted");
  } catch (error) {
    console.error("Delete conversation error:", error);
    sendError(res, "Failed to delete conversation", 500);
  }
}

// POST /api/messages
export async function sendDirectMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { receiverId, text } = req.body;

    if (!receiverId || !text?.trim()) {
      sendError(res, "receiverId and text are required");
      return;
    }

    if (receiverId === req.userId) {
      sendError(res, "You cannot message yourself");
      return;
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, role: true },
    });

    if (!receiver) {
      sendError(res, "Recipient not found", 404);
      return;
    }

    if (!canMessage(req.userRole!, receiver.role)) {
      sendError(res, "You are not allowed to message this user", 403);
      return;
    }

    const [message, sender] = await prisma.$transaction(async (tx) => {
      // New activity brings the thread back for both participants
      await tx.directConversationHide.deleteMany({
        where: {
          OR: [
            { userId: req.userId!, peerId: receiverId },
            { userId: receiverId, peerId: req.userId! },
          ],
        },
      });

      const created = await tx.directMessage.create({
        data: {
          senderId: req.userId!,
          receiverId,
          senderRole: req.userRole as UserRole,
          receiverRole: receiver.role,
          text: text.trim(),
        },
      });

      const senderUser = await tx.user.findUnique({
        where: { id: req.userId! },
        select: userSummarySelect,
      });

      return [created, senderUser] as const;
    });

    emitReceiveMessage({
      message,
      sender,
      // Receiver gets it live; sender's other tabs stay in sync too
      toUserIds: [receiverId, req.userId!],
    });

    const preview =
      message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text;
    void createNotification({
      userId: receiverId,
      type: "MESSAGE",
      title: "New message",
      body: `${sender?.fullName || "Someone"}: ${preview}`,
      data: {
        messageId: message.id,
        senderId: req.userId!,
        senderName: sender?.fullName || "",
        senderRole: sender?.role || "",
      },
      dedupeKey: `message:${message.id}`,
    });

    sendCreated(res, message, "Message sent");
  } catch (error) {
    console.error("Send direct message error:", error);
    sendError(res, "Failed to send message", 500);
  }
}
