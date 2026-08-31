import { Response } from "express";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service";

// GET /api/notifications
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const unreadOnly = String(req.query.unreadOnly || "") === "true";
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const result = await listNotifications(req.userId!, { limit, unreadOnly });
    sendSuccess(res, result);
  } catch (error) {
    console.error("Get notifications error:", error);
    sendError(res, "Failed to fetch notifications", 500);
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const unreadCount = await getUnreadNotificationCount(req.userId!);
    sendSuccess(res, { unreadCount });
  } catch (error) {
    console.error("Get unread notification count error:", error);
    sendError(res, "Failed to fetch unread count", 500);
  }
}

// POST /api/notifications/:id/read
export async function readNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const notification = await markNotificationRead(
      req.userId!,
      String(req.params.id),
    );
    if (!notification) {
      sendError(res, "Notification not found", 404);
      return;
    }
    const unreadCount = await getUnreadNotificationCount(req.userId!);
    sendSuccess(res, { notification, unreadCount });
  } catch (error) {
    console.error("Mark notification read error:", error);
    sendError(res, "Failed to mark notification as read", 500);
  }
}

// POST /api/notifications/read-all
export async function readAllNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const updated = await markAllNotificationsRead(req.userId!);
    sendSuccess(res, { updated, unreadCount: 0 });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    sendError(res, "Failed to mark notifications as read", 500);
  }
}
