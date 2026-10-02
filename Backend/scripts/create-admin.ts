import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/hash";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    console.error("Refusing to create admin in production without ALLOW_SEED=true.");
    process.exit(1);
  }
  const email = process.env.ADMIN_EMAIL || "admin@fitfinder.com";
  const password = process.env.ADMIN_PASSWORD || "password123";
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("ADMIN_PASSWORD not set — using development default. Set a strong value.");
  }
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists!");
    return;
  }
  
  const passwordHash = await hashPassword(password);
  
  await prisma.user.create({
    data: {
      fullName: "FitFinder Admin",
      email: email,
      passwordHash: passwordHash,
      role: "ADMIN",
      emailVerified: true,
    }
  });
  
  console.log("Admin user created successfully!");
  console.log("Email:", email);
  console.log("Password:", password);
}

main().finally(() => prisma.$disconnect());
