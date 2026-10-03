import { Router } from "express";
import { authenticate } from "@/middlewares/auth";
import NotificationController from "@/controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.getNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.post("/read-all", NotificationController.readAllNotifications);
router.post("/:id/read", NotificationController.readNotification);

export default router;
