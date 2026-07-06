import { prisma } from './src/lib/prisma';

async function main() {
  const reportId = "5563d4ee-b5c5-42de-bace-1093eb2c6f42";
  
  await prisma.inventoryLog.updateMany({
    where: {
      reportId: reportId,
      batchNo: "290626-42524(STD)"
    },
    data: {
      batchNo: "290626-42524"
    }
  });

  console.log("Updated batch numbers!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
