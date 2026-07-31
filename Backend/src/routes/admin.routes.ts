import { Router } from "express";
import {
  getDashboard, getUsers, removeUser,
  getTransactions, getWalkInApprovals,
} from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.delete("/users/:id", removeUser);
router.get("/transactions", getTransactions);
router.get("/walk-in-approvals", getWalkInApprovals);

export default router;
