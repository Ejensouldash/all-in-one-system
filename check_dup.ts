import { prisma } from './src/lib/prisma';

async function main() {
  const items = await prisma.transferInItem.findMany({
    where: { batchNo: { in: ["230626-42524 (STD)", "290725-42524 (B)"] } },
    include: { transferIn: true }
  });
  console.log(items.map(i => ({
    doNumber: i.transferIn.doNumber,
    bags: i.bags,
    batchNo: i.batchNo
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
