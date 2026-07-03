import { prisma } from './src/lib/prisma';

async function main() {
  const items = await prisma.transferInItem.findMany({
    where: { batchNo: { startsWith: 'B8/' } }
  });
  console.log("Remaining B8/ items:", items.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
