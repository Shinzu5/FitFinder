import { PrismaClient } from "@prisma/client";

/**
 * Neon pooled URL should include connection_limit (see .env).
 * Singleton client for the Express process.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
});

/** One reconnect attempt for transient Neon pool drops (P1017 / P1001 / P2024). */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (retries > 0 && (code === "P1017" || code === "P1001" || code === "P2024")) {
      try {
        await prisma.$connect();
      } catch {
        /* ignore */
      }
      return withDbRetry(fn, retries - 1);
    }
    throw error;
  }
}

export default prisma;
