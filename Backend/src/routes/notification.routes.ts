import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/read-all", readAllNotifications);
router.post("/:id/read", readNotification);

export default router;
