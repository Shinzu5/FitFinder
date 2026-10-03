import { Router } from "express";
import ClerkController from "@/controllers/clerk.controller";
import AttendanceController from "@/controllers/attendance.controller";
import { authenticate } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/requireRole";

const router = Router();

router.use(authenticate);

/** Owner and Clerk share walk-in payment, approvals, and daily close */
const walkInStaff = requireRole("CLERK", "OWNER");

/** Owner + Clerk share Walk-in Payment (record / today's log / close) */
router.get("/dashboard", walkInStaff, ClerkController.getDashboard);
router.get("/transactions", walkInStaff, ClerkController.getTransactions);
router.post("/transactions", walkInStaff, ClerkController.recordPayment);
router.put("/transactions/:id", walkInStaff, ClerkController.updatePayment);
router.delete("/transactions/:id", walkInStaff, ClerkController.deletePayment);
router.get("/members", walkInStaff, ClerkController.getMembers);
router.post("/members", walkInStaff, ClerkController.registerMember);
router.get("/plans", walkInStaff, ClerkController.getPlans);

router.get("/approvals", walkInStaff, ClerkController.getApprovals);
router.put("/approvals/:id/approve", walkInStaff, ClerkController.approveWalkIn);
router.put("/approvals/:id/decline", walkInStaff, ClerkController.declineWalkIn);
router.get("/walk-in-payments", walkInStaff, ClerkController.getWalkInPayments);
router.post("/walk-in-payments/:id/complete", walkInStaff, ClerkController.completeWalkInPayment);

router.get("/sales/closing-preview", walkInStaff, ClerkController.getClosingPreview);
router.post("/sales/close", walkInStaff, ClerkController.closeDailySales);

/** Attendance tracker (members + walk-in visitors) */
router.get("/attendance", walkInStaff, AttendanceController.getAttendance);
router.post("/attendance/check-in", walkInStaff, AttendanceController.postMemberCheckIn);
router.post("/attendance/walk-in", walkInStaff, AttendanceController.postWalkInCheckIn);
router.post("/attendance/:id/check-out", walkInStaff, AttendanceController.postCheckOut);

export default router;
