import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";

import { env } from "./config/env";
import { verifyEmailConfig } from "./config/email";
import { setEmailEnabled } from "./services/email.service";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./socket";
import { backfillMissingPlanSnapshots } from "./services/membershipAccess.service";
import { runNotificationJobs } from "./services/notificationJobs.service";

// Routes
import authRoutes from "./routes/auth.routes";
import gymRoutes from "./routes/gym.routes";
import adminRoutes from "./routes/admin.routes";
import ownerRoutes from "./routes/owner.routes";
import clerkRoutes from "./routes/clerk.routes";
import userRoutes from "./routes/user.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import uploadRoutes from "./routes/upload.routes";
import messagingRoutes from "./routes/messaging.routes";
import paymentRoutes from "./routes/payment.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();
const server = http.createServer(app);
initSocket(server);


// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: (origin, callback) => {
    // Same-origin / curl / health checks have no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowed = new Set(
      [...env.ALLOWED_ORIGINS, "https://fitfinder.fun", "https://www.fitfinder.fun"].map((s) =>
        s.replace(/\/+$/, ""),
      ),
    );
    if (allowed.has(origin.replace(/\/+$/, ""))) {
      callback(null, true);
      return;
    }
    // Local/dev frontends (localhost, 127.0.0.1, LAN) always allowed outside production.
    if (
      env.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Routes ───────────────────────────────────────────────────────────────────
// Auth brute-force limiter is applied only on login/register/password routes
// (see auth.routes.ts) — not on /refresh or /me, which run on every session.

app.use("/api/auth", authRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/clerk", clerkRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

/** Boots email, Neon maintenance jobs, and the HTTP + Socket.IO server. */
async function start() {
  try {
    const emailOk = await verifyEmailConfig();
    setEmailEnabled(emailOk);

    // Safe one-time-ish backfill + periodic expiry / reminder jobs (Neon)
    void backfillMissingPlanSnapshots().catch((err) =>
      console.error("Plan snapshot backfill failed:", err),
    );
    void runNotificationJobs();
    setInterval(() => {
      void runNotificationJobs();
    }, 60_000);

    server.listen(env.PORT, () => {
      console.log(`\n🚀 FitFinder API running on http://localhost:${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
      console.log(`🌐 Allowed origins: ${env.ALLOWED_ORIGINS.join(", ")}`);
      console.log(`📁 Uploads: ${path.join(process.cwd(), "uploads")}`);
      console.log(`🔌 Socket.IO ready for real-time messaging + notifications\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
