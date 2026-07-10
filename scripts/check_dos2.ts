import { prisma } from './src/lib/prisma';

async function main() {
  const do1 = await prisma.transferIn.findFirst({
    where: { doNumber: "DO - 020726" },
    include: { items: true }
  });
  console.log("DO - 020726:", JSON.stringify(do1, null, 2));

  const do2 = await prisma.transferIn.findFirst({
    where: { doNumber: "DO - 20260702" },
    include: { items: true }
  });
  console.log("DO - 20260702:", JSON.stringify(do2, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
