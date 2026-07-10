const path = require('path');
require('ts-node').register({ transpileOnly: true });
const { prisma } = require('./src/lib/prisma.ts');

async function run() {
  const items = await prisma.transferInItem.findMany({
    where: { batchNo: '4STDF-030326' },
    include: { transferIn: true }
  });
  console.log("Transfer Ins:");
  console.log(JSON.stringify(items, null, 2));
}

run().catch(console.error).finally(()=>prisma.$disconnect());
