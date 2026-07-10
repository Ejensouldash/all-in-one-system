const path = require('path');
require('ts-node').register({ transpileOnly: true });
const { prisma } = require('./src/lib/prisma.ts');

async function run() {
  const t = await prisma.transferIn.findMany({
    where: { doNumber: { contains: '260952' } },
    include: { items: true }
  });
  console.log("Found:", JSON.stringify(t, null, 2));
}

run().catch(console.error).finally(()=>prisma.$disconnect());
