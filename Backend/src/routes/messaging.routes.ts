import { Router } from "express";
import MessagingController from "@/controllers/messaging.controller";
import { authenticate } from "@/middlewares/auth";

const router = Router();

// Any authenticated role can search/message, subject to the role rules
// enforced inside the controller.
router.use(authenticate);

router.get("/search", MessagingController.searchUsers);
router.get("/conversations", MessagingController.getConversations);
router.get("/thread/:userId", MessagingController.getThread);
router.post("/thread/:userId/read", MessagingController.markThreadRead);
router.delete("/conversations/:userId", MessagingController.hideConversation);
router.post("/", MessagingController.sendDirectMessage);

export default router;
