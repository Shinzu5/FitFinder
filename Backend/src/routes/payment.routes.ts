import { Router } from "express";
import {
  createGcashPaymentHandler,
  checkPaymentStatus,
  xenditWebhook,
} from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Create a GCash payment (authenticated)
router.post("/create-gcash", authenticate, createGcashPaymentHandler);

// Check payment status (authenticated)
router.get("/:id/status", authenticate, checkPaymentStatus);

// Xendit webhook callback (NOT authenticated — Xendit calls this directly)
router.post("/xendit-webhook", xenditWebhook);

export default router;
