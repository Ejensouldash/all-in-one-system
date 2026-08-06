import { prisma } from '../src/lib/prisma';

async function main() {
  const dos = await prisma.transferInItem.findMany({
    select: { category: true, batchNo: true, mult: true }
  });
  const logs = await prisma.inventoryLog.findMany({
    where: { type: 'Usage' },
    select: { sectionKey: true, batchNo: true, bags: true, mult: true }
  });
  console.log("Categories found:", Array.from(new Set(dos.map(d => d.category))));
  console.log("Sections found:", Array.from(new Set(logs.map(l => l.sectionKey))));
}

main().finally(() => prisma.$disconnect());
