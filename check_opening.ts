import { prisma } from './src/lib/prisma';

async function main() {
  const stocks = await prisma.warehouseOpeningStock.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total opening stocks: ${stocks.length}`);
  for(const s of stocks) {
    console.log(`${s.batchNumber}: QTY=${s.openingQty}, MONTH=${s.month}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
