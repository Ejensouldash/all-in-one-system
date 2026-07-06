import { prisma } from './src/lib/prisma';

async function main() {
  const items = await prisma.transferInItem.findMany({
    where: { category: { contains: 'BOX' } }
  });
  console.log(items.map(i => i.batchNo).filter(b => b.includes('290626') || b.includes('230626')));
}

main().catch(console.error).finally(() => prisma.$disconnect());
