import { prisma } from './src/lib/prisma';

async function main() {
  const batches = await prisma.inventoryBatch.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total batches: ${batches.length}`);
  for(const b of batches.slice(0, 10)) {
    console.log(`${b.batchNumber}: IN=${b.totalQtyIn}, OUT=${b.totalQtyOut}, AVAIL=${b.availableBalance}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
