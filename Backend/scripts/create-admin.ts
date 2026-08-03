import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./src/utils/hash";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@fitfinder.com";
  const password = "password123";
  
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
