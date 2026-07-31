import { Router } from "express";
import {
  joinGym, getMembership, leaveMembership,
  getMessages, sendUserMessage, aiChat,
  getWalkInStatus,
  completeWalkInOnboarding,
  getMemberExercises, getMemberEquipment, getMemberShop,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All user routes require USER or OWNER role
router.use(authenticate, requireRole("USER", "OWNER"));

router.post("/join-gym", joinGym);
router.get("/membership", getMembership);
router.delete("/membership", leaveMembership);
router.get("/messages", getMessages);
router.post("/messages", sendUserMessage);
router.post("/ai-chat", aiChat);
router.get("/walk-in-status", getWalkInStatus);
router.post("/walk-in-done/:id", completeWalkInOnboarding);
router.get("/exercises", getMemberExercises);
router.get("/equipment", getMemberEquipment);
router.get("/shop", getMemberShop);

export default router;
