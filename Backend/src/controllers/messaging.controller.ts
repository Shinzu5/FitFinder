import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import { canMessage } from "@/utils/messagingRules";
import {
  DeleteConversationService,
  GetConversationsService,
  GetThreadService,
  MarkThreadReadService,
  SearchUsersService,
  SendDirectMessageService,
} from "@/services/messaging";

export class MessagingController {
  // GET /api/messages/search?q=...
  public searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!query) {
        sendSuccess(res, []);
        return;
      }

      const users = await SearchUsersService({
        excludeUserId: req.userId!,
        query,
      });

      const messagable = users.filter((user) => canMessage(req.userRole!, user.role));
      sendSuccess(res, messagable);
    } catch (error) {
      console.error("Search users error:", error);
      sendError(res, "Failed to search users", 500);
    }
  };

  // GET /api/messages/conversations
  public getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const conversations = await GetConversationsService(req.userId!);

      sendSuccess(res, conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      sendError(res, "Failed to fetch conversations", 500);
    }
  };

  // GET /api/messages/thread/:userId
  public getThread = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await GetThreadService({
        userId: req.userId!,
        otherUserId: String(req.params.userId),
        actorRole: req.userRole!,
      });

      if (result.kind === "not-found") {
        sendError(res, "User not found", 404);
        return;
      }

      if (result.kind === "forbidden") {
        sendError(res, "You are not allowed to view this conversation", 403);
        return;
      }

      sendSuccess(res, {
        user: result.user,
        gymName: result.gymName,
        messages: result.messages,
      });
    } catch (error) {
      console.error("Get thread error:", error);
      sendError(res, "Failed to fetch conversation", 500);
    }
  };

  // POST /api/messages/thread/:userId/read
  public markThreadRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await MarkThreadReadService({
        userId: req.userId!,
        peerId: String(req.params.userId),
      });

      sendSuccess(res, { updated: result.updated });
    } catch (error) {
      console.error("Mark thread read error:", error);
      sendError(res, "Failed to mark messages as read", 500);
    }
  };

  // DELETE /api/messages/conversations/:userId — permanently delete the thread for both sides
  public hideConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await DeleteConversationService({
        userId: req.userId!,
        peerId: String(req.params.userId),
      });

      if (result.kind === "invalid") {
        sendError(res, "Invalid conversation");
        return;
      }

      sendSuccess(res, { peerId: result.peerId }, "Conversation permanently deleted");
    } catch (error) {
      console.error("Delete conversation error:", error);
      sendError(res, "Failed to delete conversation", 500);
    }
  };

  // POST /api/messages
  public sendDirectMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { receiverId, text } = req.body;

      const result = await SendDirectMessageService({
        senderId: req.userId!,
        senderRole: req.userRole!,
        receiverId,
        text,
      });

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendCreated(res, result.message, "Message sent");
    } catch (error) {
      console.error("Send direct message error:", error);
      sendError(res, "Failed to send message", 500);
    }
  };
}

export default new MessagingController();
