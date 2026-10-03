import { Router } from "express";
import GymController from "@/controllers/gym.controller";
import { authenticate } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/requireRole";

const router = Router();

// Public
router.get("/", GymController.listGyms);
router.get("/:id", GymController.getGym);

// Authenticated owner routes
router.post("/", authenticate, requireRole("USER", "OWNER", "ADMIN"), GymController.createGym);
router.put("/:id", authenticate, requireRole("USER", "OWNER", "ADMIN"), GymController.updateGym);
router.delete("/:id", authenticate, requireRole("USER", "OWNER", "ADMIN"), GymController.deleteGym);

export default router;
