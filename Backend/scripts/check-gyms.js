const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const gyms = await prisma.gym.findMany({ select: { id: true, name: true, status: true, owner: { select: { email: true } } } });
  console.log(gyms);
}
main().finally(() => prisma.$disconnect());
