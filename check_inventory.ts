import { prisma } from './src/lib/prisma';

async function main() {
  const batches = await prisma.inventoryBatch.findMany({
    where: { availableBalance: { gt: 0 } }
  });
  console.log(`Total batches with availableBalance > 0: ${batches.length}`);
  console.log(batches.map(b => b.batchNumber));
}

main().catch(console.error).finally(() => prisma.$disconnect());
