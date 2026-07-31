import { Router } from "express";
import {
  getDashboard, getUsers, removeUser,
  getTransactions, getAdminGyms, getAnalytics,
} from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/gyms", getAdminGyms);
router.get("/analytics", getAnalytics);
router.get("/users", getUsers);
router.delete("/users/:id", removeUser);
router.get("/transactions", getTransactions);

export default router;
