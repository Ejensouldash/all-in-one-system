import { prisma } from './src/lib/prisma';

async function main() {
  const reportId = "5563d4ee-b5c5-42de-bace-1093eb2c6f42";
  
  // Insert Before Usage for BOX 425x24
  await prisma.inventoryLog.create({
    data: {
      type: "Usage",
      period: "Before",
      sectionKey: "BOX_p425_24",
      batchNo: "290626-42524",
      bags: 1151,
      mult: 1,
      report: { connect: { id: reportId } }
    }
  });

  // Insert After Usage for BOX 425x24
  await prisma.inventoryLog.create({
    data: {
      type: "Usage",
      period: "After",
      sectionKey: "BOX_p425_24",
      batchNo: "290626-42524",
      bags: 265,
      mult: 1,
      report: { connect: { id: reportId } }
    }
  });

  // 425mlx6
  await prisma.inventoryLog.create({
    data: {
      type: "Usage",
      period: "Before",
      sectionKey: "BOX_p425_6",
      batchNo: "130526-42506",
      bags: 610,
      mult: 1,
      report: { connect: { id: reportId } }
    }
  });

  console.log("Keyed in usages into report!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
