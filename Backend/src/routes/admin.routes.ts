import { Router } from "express";
import {
  getDashboard, getUsers, removeUser,
  getGymApplications, approveGym, declineGym,
  getTransactions,
} from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.delete("/users/:id", removeUser);
router.get("/gym-applications", getGymApplications);
router.put("/gym-applications/:id/approve", approveGym);
router.put("/gym-applications/:id/decline", declineGym);
router.get("/transactions", getTransactions);

export default router;
