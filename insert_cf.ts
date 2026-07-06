import { prisma } from './src/lib/prisma';

async function main() {
  const reportId = "5563d4ee-b5c5-42de-bace-1093eb2c6f42";
  
  await prisma.inventoryLog.create({
    data: {
      type: "CarryForward",
      sectionKey: "BOX_p425_24",
      batchNo: "290626-42524(STD)",
      bags: 296,
      mult: 1,
      report: { connect: { id: reportId } }
    }
  });

  await prisma.inventoryLog.create({
    data: {
      type: "CarryForward",
      sectionKey: "BOX_p425_24",
      batchNo: "290725-42524(B)",
      bags: 285,
      mult: 1,
      report: { connect: { id: reportId } }
    }
  });

  console.log("Keyed in carry forwards into report!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
