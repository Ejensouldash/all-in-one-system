const path = require('path');
// Register ts-node so we can require the TS prisma file
require('ts-node').register({ transpileOnly: true });

const { prisma } = require('./src/lib/prisma.ts');

async function run() {
  const logs = await prisma.inventoryLog.findMany({
    where: { batchNo: '4STDF-030326' },
    include: { report: { select: { shift: true, date: true } } }
  });
  console.log(JSON.stringify(logs, null, 2));
}

run().catch(console.error).finally(()=>prisma.$disconnect());
