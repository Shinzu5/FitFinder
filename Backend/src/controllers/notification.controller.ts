import { Response } from "express";
import { sendSuccess, sendError } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import {
  GetUnreadNotificationCountService,
  ListNotificationsService,
  MarkAllNotificationsReadService,
  MarkNotificationReadService,
} from "@/services/notification";

export class NotificationController {
  // GET /api/notifications
  public getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const unreadOnly = String(req.query.unreadOnly || "") === "true";
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const result = await ListNotificationsService(req.userId!, { limit, unreadOnly });
      sendSuccess(res, result);
    } catch (error) {
      console.error("Get notifications error:", error);
      sendError(res, "Failed to fetch notifications", 500);
    }
  };

  // GET /api/notifications/unread-count
  public getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const unreadCount = await GetUnreadNotificationCountService(req.userId!);
      sendSuccess(res, { unreadCount });
    } catch (error) {
      console.error("Get unread notification count error:", error);
      sendError(res, "Failed to fetch unread count", 500);
    }
  };

  // POST /api/notifications/:id/read
  public readNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const notification = await MarkNotificationReadService(
        req.userId!,
        String(req.params.id),
      );
      if (!notification) {
        sendError(res, "Notification not found", 404);
        return;
      }
      const unreadCount = await GetUnreadNotificationCountService(req.userId!);
      sendSuccess(res, { notification, unreadCount });
    } catch (error) {
      console.error("Mark notification read error:", error);
      sendError(res, "Failed to mark notification as read", 500);
    }
  };

  // POST /api/notifications/read-all
  public readAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const updated = await MarkAllNotificationsReadService(req.userId!);
      // Re-query like readNotification does — never report a hardcoded 0 that a
      // later unread-count fetch would immediately contradict.
      const unreadCount = await GetUnreadNotificationCountService(req.userId!);
      sendSuccess(res, { updated, unreadCount });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      sendError(res, "Failed to mark notifications as read", 500);
    }
  };
}

export default new NotificationController();
