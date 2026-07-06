import { prisma } from './src/lib/prisma';

async function main() {
  const items = await prisma.transferInItem.findMany({
    where: { category: "CAP" },
    include: { transferIn: true },
    orderBy: { transferIn: { receiveDate: 'desc' } }
  })
  
  console.log("Current CAP Items remaining:");
  items.forEach(i => {
    console.log(`ID: ${i.id} | Batch: ${i.batchNo} | DO: ${i.transferIn?.doNumber} | Date: ${i.transferIn?.receiveDate}`)
  })
}
main().catch(console.error).finally(() => prisma.$disconnect());
