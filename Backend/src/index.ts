import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";

import { env } from "./config/env";
import { verifyEmailConfig } from "./config/email";
import { setEmailEnabled } from "./services/email.service";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./socket";

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

const app = express();
const server = http.createServer(app);
initSocket(server);


// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: "Too many attempts, please try again later." },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/clerk", clerkRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/messages", messagingRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

async function start() {
  try {
    const emailOk = await verifyEmailConfig();
    setEmailEnabled(emailOk);

    server.listen(env.PORT, () => {
      console.log(`\n🚀 FitFinder API running on http://localhost:${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
      console.log(`📁 Uploads: ${path.join(process.cwd(), "uploads")}`);
      console.log(`🔌 Socket.IO ready for real-time messaging\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
