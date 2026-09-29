import { Router } from "express";
import { listGyms, getGym, createGym, updateGym, deleteGym } from "../controllers/gym.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

// Public
router.get("/", listGyms);
router.get("/:id", getGym);

// Authenticated owner routes
router.post("/", authenticate, requireRole("USER", "OWNER", "ADMIN"), createGym);
router.put("/:id", authenticate, requireRole("USER", "OWNER", "ADMIN"), updateGym);
router.delete("/:id", authenticate, requireRole("USER", "OWNER", "ADMIN"), deleteGym);

export default router;
