import { prisma } from './src/lib/prisma';

async function main() {
  const transferIn = await prisma.transferIn.create({
    data: {
      receiveDate: new Date("2026-07-03"),
      receiveTime: "10:52",
      doNumber: "DO - 260916",
      receiverName: "Nizam QC",
      items: {
        create: [
          { category: "CAP", batchNo: "042726-02", bags: 8, mult: 4000 }
        ]
      }
    }
  })
  
  console.log("Restored DO - 260916", transferIn);
}
main().catch(console.error).finally(() => prisma.$disconnect());
