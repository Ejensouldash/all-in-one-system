import { prisma } from "../src/lib/prisma";

async function main() {
  const usages = await prisma.inventoryLog.findMany({
    where: { type: 'Usage', mult: 1 }
  });

  console.log(`Found ${usages.length} usages to backfill.`);

  for (const usage of usages) {
    const doItem = await prisma.transferInItem.findFirst({
      where: { batchNo: usage.batchNo },
      orderBy: { bags: 'desc' } // just pick the biggest one if multiple
    });
    
    if (doItem && doItem.mult > 1) {
      await prisma.inventoryLog.update({
        where: { id: usage.id },
        data: { mult: doItem.mult }
      });
      console.log(`Updated ${usage.batchNo} mult to ${doItem.mult}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
