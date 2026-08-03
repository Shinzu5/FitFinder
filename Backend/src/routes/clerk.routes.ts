import { Router } from "express";
import {
  getDashboard, getTransactions, recordPayment, updatePayment, deletePayment,
  getMembers, registerMember, getPlans,
  getApprovals, approveWalkIn, declineWalkIn,
  getWalkInPayments, completeWalkInPayment,
  getClosingPreview, closeDailySales,
} from "../controllers/clerk.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.use(authenticate);

/** Owner and Clerk share walk-in payment, approvals, and daily close */
const walkInStaff = requireRole("CLERK", "OWNER");

/** Owner + Clerk share Walk-in Payment (record / today's log / close) */
router.get("/dashboard", walkInStaff, getDashboard);
router.get("/transactions", walkInStaff, getTransactions);
router.post("/transactions", walkInStaff, recordPayment);
router.put("/transactions/:id", walkInStaff, updatePayment);
router.delete("/transactions/:id", walkInStaff, deletePayment);
router.get("/members", walkInStaff, getMembers);
router.post("/members", walkInStaff, registerMember);
router.get("/plans", walkInStaff, getPlans);

router.get("/approvals", walkInStaff, getApprovals);
router.put("/approvals/:id/approve", walkInStaff, approveWalkIn);
router.put("/approvals/:id/decline", walkInStaff, declineWalkIn);
router.get("/walk-in-payments", walkInStaff, getWalkInPayments);
router.post("/walk-in-payments/:id/complete", walkInStaff, completeWalkInPayment);

router.get("/sales/closing-preview", walkInStaff, getClosingPreview);
router.post("/sales/close", walkInStaff, closeDailySales);

export default router;
