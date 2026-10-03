/**
 * Route aggregator (reference-style `routes/index.ts`).
 * Mounts every domain router under its stable `/api/*` prefix.
 * Final paths are identical to the previous `app.use("/api/x", ...)` wiring,
 * so the frontend and `render.yaml` health check (`/api/health`) are unaffected.
 */
import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import gymRoutes from "@/routes/gym.routes";
import adminRoutes from "@/routes/admin.routes";
import ownerRoutes from "@/routes/owner.routes";
import clerkRoutes from "@/routes/clerk.routes";
import userRoutes from "@/routes/user.routes";
import subscriptionRoutes from "@/routes/subscription.routes";
import paymentRoutes from "@/routes/payment.routes";
import uploadRoutes from "@/routes/upload.routes";
import messagingRoutes from "@/routes/messaging.routes";
import notificationRoutes from "@/routes/notification.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/gyms", gymRoutes);
router.use("/admin", adminRoutes);
router.use("/owner", ownerRoutes);
router.use("/clerk", clerkRoutes);
router.use("/user", userRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/payments", paymentRoutes);
router.use("/upload", uploadRoutes);
router.use("/messages", messagingRoutes);
router.use("/notifications", notificationRoutes);

export default router;
