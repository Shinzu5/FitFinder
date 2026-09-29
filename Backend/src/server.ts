import path from "path";

import { env } from "./config/env";
import { verifyEmailConfig } from "./config/email";
import { setEmailEnabled } from "./services/email/email.service";
import { backfillMissingPlanSnapshots } from "./services/membership/membershipAccess.service";
import { runNotificationJobs } from "./services/notification/notificationJobs.service";
import { server } from "./app";

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
      console.log(`📁 Uploads: ${path.join(process.cwd(), "uploads")}`);
      console.log(`🔌 Socket.IO ready for real-time messaging + notifications\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
