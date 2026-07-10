import { prisma } from './src/lib/prisma';

async function main() {
  const ts = await prisma.transferIn.findMany({
    where: { doNumber: "DO - 260916" },
    include: { items: true }
  });
  console.log(JSON.stringify(ts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
