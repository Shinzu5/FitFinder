import { Router } from "express";
import {
  joinGym, getMembership, getMemberships, switchActiveGym, leaveMembership,
  aiChat,
  getWalkInStatus,
  completeWalkInOnboarding,
  getMemberExercises, getMemberEquipment, getMemberShop,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth-middleware";
import { requireRole } from "../middlewares/rbac-middleware";

const router = Router();

// All user routes require USER or OWNER role
router.use(authenticate, requireRole("USER", "OWNER"));

router.post("/join-gym", joinGym);
router.get("/membership", getMembership);
router.get("/memberships", getMemberships);
router.patch("/active-gym", switchActiveGym);
router.delete("/membership", leaveMembership);
router.post("/ai-chat", aiChat);
router.get("/walk-in-status", getWalkInStatus);
router.post("/walk-in-done/:id", completeWalkInOnboarding);
router.get("/exercises", getMemberExercises);
router.get("/equipment", getMemberEquipment);
router.get("/shop", getMemberShop);

export default router;
