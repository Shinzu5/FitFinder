import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USERS = [
  {
    fullName: "Admin Super",
    email: "admin@test.com",
    password: "Password123!",
    role: "ADMIN" as const,
  },
  {
    fullName: "Owner User",
    email: "owner@test.com",
    password: "Password123!",
    role: "OWNER" as const,
  },
  {
    fullName: "Ana Reyes",
    email: "clerk@test.com",
    password: "Password123!",
    role: "CLERK" as const,
  },
  {
    fullName: "Member User",
    email: "member@test.com",
    password: "Password123!",
    role: "USER" as const,
  },
];

async function main() {
  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 12);

    await prisma.user.upsert({
      where: { email: seedUser.email.toLowerCase() },
      update: {
        fullName: seedUser.fullName,
        passwordHash,
        role: seedUser.role,
        emailVerified: true,
      },
      create: {
        fullName: seedUser.fullName,
        email: seedUser.email.toLowerCase(),
        passwordHash,
        role: seedUser.role,
        emailVerified: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
