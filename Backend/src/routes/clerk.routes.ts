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

router.use(authenticate);

const clerkOnly = requireRole("CLERK");
/** Owner and Clerk share walk-in approval / Done — reuses same controllers */
const walkInStaff = requireRole("CLERK", "OWNER");

router.get("/dashboard", clerkOnly, getDashboard);
router.get("/transactions", clerkOnly, getTransactions);
router.post("/transactions", clerkOnly, recordPayment);
router.get("/members", clerkOnly, getMembers);
router.post("/members", clerkOnly, registerMember);
router.get("/plans", clerkOnly, getPlans);

router.get("/approvals", walkInStaff, getApprovals);
router.put("/approvals/:id/approve", walkInStaff, approveWalkIn);
router.put("/approvals/:id/decline", walkInStaff, declineWalkIn);
router.get("/walk-in-payments", walkInStaff, getWalkInPayments);
router.post("/walk-in-payments/:id/complete", walkInStaff, completeWalkInPayment);

router.get("/sales/closing-preview", clerkOnly, getClosingPreview);
router.post("/sales/close", clerkOnly, closeDailySales);

export default router;
