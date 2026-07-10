import { prisma } from './src/lib/prisma';

async function main() {
  const doItems = await prisma.transferIn.findMany({
    where: { doNumber: { contains: "20260702" } },
    include: { items: true }
  });
  console.log(JSON.stringify(doItems, null, 2));
}

main().catch(console.error);
