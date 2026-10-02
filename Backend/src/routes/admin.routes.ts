import { Router } from "express";
import {
  getDashboard, getUsers, getUserDetail, removeUser,
  getTransactions, getAdminGyms, getAnalytics,
} from "../controllers/admin.controller";
import { authenticate } from "../middlewares/auth-middleware";
import { requireRole } from "../middlewares/rbac-middleware";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/gyms", getAdminGyms);
router.get("/analytics", getAnalytics);
router.get("/users", getUsers);
router.get("/users/:id", getUserDetail);
router.delete("/users/:id", removeUser);
router.get("/transactions", getTransactions);

export default router;
