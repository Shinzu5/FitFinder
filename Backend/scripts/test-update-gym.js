const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'arojv23@gmail.com' } });
  const gym = await prisma.gym.findFirst({ where: { ownerId: user.id } });
  console.log("User:", user.id, user.role);
  console.log("Gym:", gym?.id, gym?.ownerId);
}
main().finally(() => prisma.$disconnect());
