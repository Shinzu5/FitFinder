const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword } = require('./src/utils/hash');

async function main() {
  // We need to generate an admin token to test the API, but it's easier to just call the function directly.
  const adminController = require('./src/controllers/admin.controller');
  
  // mock req, res
  const req = { query: {} };
  const res = {
    status: (code) => ({ json: (data) => console.log("STATUS", code, JSON.stringify(data, null, 2)) }),
    json: (data) => console.log("JSON", JSON.stringify(data, null, 2))
  };
  
  await adminController.getGymApplications(req, res);
}
main().finally(() => prisma.$disconnect());
