import { Router } from "express";
import PaymentController from "@/controllers/payment.controller";
import { authenticate } from "@/middlewares/auth";

const router = Router();

// Create a GCash payment (authenticated)
router.post("/create-gcash", authenticate, PaymentController.createGcashPaymentHandler);

// Check payment status (authenticated)
router.get("/:id/status", authenticate, PaymentController.checkPaymentStatus);

// Xendit webhook callback (NOT authenticated — Xendit calls this directly)
router.post("/xendit-webhook", PaymentController.xenditWebhook);

export default router;
