import { PrismaClient } from '@prisma/client';
import { getGymApplications } from './src/controllers/admin.controller';

const prisma = new PrismaClient();

async function main() {
  const req = { query: {} } as any;
  const res = {
    status: (code: any) => ({ json: (data: any) => console.log("STATUS", code, JSON.stringify(data, null, 2)) }),
    json: (data: any) => console.log("JSON", JSON.stringify(data, null, 2))
  } as any;
  
  await getGymApplications(req, res);
}
main().finally(() => prisma.$disconnect());
