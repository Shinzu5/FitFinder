import { Router } from "express";
import { listGyms, getGym, createGym, updateGym, deleteGym } from "../controllers/gym.controller";
import { authenticate } from "../middlewares/auth-middleware";
import { requireRole } from "../middlewares/rbac-middleware";

const router = Router();

// Public
router.get("/", listGyms);
router.get("/:id", getGym);

// Authenticated owner routes — ADMIN manages gyms via /api/admin, not this flow
router.post("/", authenticate, requireRole("USER", "OWNER"), createGym);
router.put("/:id", authenticate, requireRole("USER", "OWNER", "ADMIN"), updateGym);
router.delete("/:id", authenticate, requireRole("USER", "OWNER", "ADMIN"), deleteGym);

export default router;
