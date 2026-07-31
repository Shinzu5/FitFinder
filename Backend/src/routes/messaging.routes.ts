import { Router } from "express";
import {
  searchUsers,
  getConversations,
  getThread,
  sendDirectMessage,
  markThreadRead,
  hideConversation,
} from "../controllers/messaging.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Any authenticated role can search/message, subject to the role rules
// enforced inside the controller.
router.use(authenticate);

router.get("/search", searchUsers);
router.get("/conversations", getConversations);
router.get("/thread/:userId", getThread);
router.post("/thread/:userId/read", markThreadRead);
router.delete("/conversations/:userId", hideConversation);
router.post("/", sendDirectMessage);

export default router;
