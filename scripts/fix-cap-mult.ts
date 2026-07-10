import { prisma } from './src/lib/prisma';
async function main() {
  const res = await prisma.inventoryLog.updateMany({
    where: { sectionKey: 'CAP', type: 'Usage', mult: 1 },
    data: { mult: 4000 }
  });
  console.log('Updated', res.count);
}
main().finally(() => process.exit(0));
