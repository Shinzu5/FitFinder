import { Router } from "express";
import { listGyms, getGym, createGym, updateGym, deleteGym } from "../controllers/gym.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// Public
router.get("/", listGyms);
router.get("/:id", getGym);

// Authenticated owner routes
router.post("/", authenticate, requireRole("OWNER", "ADMIN"), createGym);
router.put("/:id", authenticate, requireRole("OWNER", "ADMIN"), updateGym);
router.delete("/:id", authenticate, requireRole("OWNER", "ADMIN"), deleteGym);

export default router;
