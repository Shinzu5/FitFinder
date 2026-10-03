import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";

import { env } from "@/config/env";
import { errorHandler } from "@/middlewares/errorHandler";
import { initSocket } from "@/socket";

// Routes (aggregated — see routes/index.ts for stable /api/* prefixes)
import routes from "@/routes";

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
      env.ALLOWED_ORIGINS.map((s) =>
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

app.use("/api", routes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 for unknown API routes (JSON, not Express HTML default)
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use(errorHandler);

export { app, server };
