import { prisma } from './src/lib/prisma';

async function main() {
  const doRecord = await prisma.transferIn.create({
    data: {
      receiveDate: new Date("2026-07-02"),
      receiveTime: "06:53 pm",
      doNumber: "DO - 20260702",
      receiverName: "SYAZWANI",
      items: {
        create: [
          {
            category: "BOX 425ML X 24",
            batchNo: "230626-42524 (STD)",
            bags: 812,
            mult: 1
          },
          {
            category: "BOX 425ML X 24",
            batchNo: "290725-42524 (B)",
            bags: 285,
            mult: 1
          }
        ]
      }
    }
  });
  console.log("Created DO:", doRecord.id);
}

main().catch(console.error);
