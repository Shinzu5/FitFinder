const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const payments = await prisma.xenditPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  console.log(payments);
}
main().finally(() => prisma.$disconnect());
