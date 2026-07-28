import { Router } from "express";
import {
  searchUsers,
  getConversations,
  getThread,
  sendDirectMessage,
} from "../controllers/messaging.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Any authenticated role can search/message, subject to the role rules
// enforced inside the controller.
router.use(authenticate);

router.get("/search", searchUsers);
router.get("/conversations", getConversations);
router.get("/thread/:userId", getThread);
router.post("/", sendDirectMessage);

export default router;
