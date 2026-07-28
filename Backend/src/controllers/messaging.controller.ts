import { Response } from "express";
import { UserRole } from "@prisma/client";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { canMessage } from "../utils/messagingRules";
import { getIO, userRoom } from "../socket";

const userSummarySelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  avatarUrl: true,
} as const;

// GET /api/messages/search?q=...
// Search registered users this account is allowed to message.
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
// List distinct users the current account has exchanged direct messages with,
// most recent first.
export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const messages = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: userSummarySelect },
        receiver: { select: userSummarySelect },
      },
    });

    const seen = new Set<string>();
    const conversations: Array<{
      user: (typeof messages)[number]["sender"];
      lastMessage: string;
      lastMessageAt: string;
      lastSenderId: string;
    }> = [];

    for (const message of messages) {
      const otherUser = message.senderId === userId ? message.receiver : message.sender;
      if (seen.has(otherUser.id)) continue;
      seen.add(otherUser.id);
      conversations.push({
        user: otherUser,
        lastMessage: message.text,
        lastMessageAt: message.createdAt.toISOString(),
        lastSenderId: message.senderId,
      });
    }

    sendSuccess(res, conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    sendError(res, "Failed to fetch conversations", 500);
  }
}

// GET /api/messages/thread/:userId
// Full message history between the current account and another user.
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

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    sendSuccess(res, { user: otherUser, messages });
  } catch (error) {
    console.error("Get thread error:", error);
    sendError(res, "Failed to fetch conversation", 500);
  }
}

// POST /api/messages
// body: { receiverId, text }
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

    const [message, sender] = await Promise.all([
      prisma.directMessage.create({
        data: {
          senderId: req.userId!,
          receiverId,
          senderRole: req.userRole as UserRole,
          text: text.trim(),
        },
      }),
      prisma.user.findUnique({ where: { id: req.userId! }, select: userSummarySelect }),
    ]);

    try {
      getIO().to(userRoom(receiverId)).emit("receive_message", { message, sender });
    } catch (socketError) {
      // Socket.IO not initialized (e.g. in tests) — REST response still succeeds.
      console.error("Socket emit failed:", socketError);
    }

    sendCreated(res, message, "Message sent");
  } catch (error) {
    console.error("Send direct message error:", error);
    sendError(res, "Failed to send message", 500);
  }
}
