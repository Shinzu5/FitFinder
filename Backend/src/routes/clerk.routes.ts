import { Router } from "express";
import {
  getDashboard, getTransactions, recordPayment,
  getMembers, registerMember, getPlans,
  getApprovals, approveWalkIn, declineWalkIn,
  getWalkInPayments, completeWalkInPayment,
  getClosingPreview, closeDailySales,
} from "../controllers/clerk.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All clerk routes require CLERK role
router.use(authenticate, requireRole("CLERK"));

router.get("/dashboard", getDashboard);
router.get("/transactions", getTransactions);
router.post("/transactions", recordPayment);
router.get("/members", getMembers);
router.post("/members", registerMember);
router.get("/plans", getPlans);
router.get("/approvals", getApprovals);
router.put("/approvals/:id/approve", approveWalkIn);
router.put("/approvals/:id/decline", declineWalkIn);
router.get("/walk-in-payments", getWalkInPayments);
router.post("/walk-in-payments/:id/complete", completeWalkInPayment);
router.get("/sales/closing-preview", getClosingPreview);
router.post("/sales/close", closeDailySales);

export default router;
