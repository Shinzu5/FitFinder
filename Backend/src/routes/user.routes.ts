import { Router } from "express";
import UserController from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/requireRole";

const router = Router();

// All user routes require USER or OWNER role
router.use(authenticate, requireRole("USER", "OWNER"));

router.post("/join-gym", UserController.joinGym);
router.get("/membership", UserController.getMembership);
router.get("/memberships", UserController.getMemberships);
router.patch("/active-gym", UserController.switchActiveGym);
router.delete("/membership", UserController.leaveMembership);
router.get("/messages", UserController.getMessages);
router.post("/messages", UserController.sendUserMessage);
router.post("/ai-chat", UserController.aiChat);
router.get("/walk-in-status", UserController.getWalkInStatus);
router.post("/walk-in-done/:id", UserController.completeWalkInOnboarding);
router.get("/exercises", UserController.getMemberExercises);
router.get("/equipment", UserController.getMemberEquipment);
router.get("/shop", UserController.getMemberShop);

export default router;
