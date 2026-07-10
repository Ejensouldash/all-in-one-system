const path = require('path');
require('ts-node').register({ transpileOnly: true });
const { prisma } = require('./src/lib/prisma.ts');

async function run() {
  const d = await prisma.department.findMany();
  console.log("Departments:", JSON.stringify(d, null, 2));
}

run().catch(console.error).finally(()=>prisma.$disconnect());
