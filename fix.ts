import { prisma } from './src/lib/prisma';

async function main() {
  await prisma.transferIn.delete({
    where: { id: "83390b55-12ac-4142-a606-64e41fbaaaea" }
  });
  console.log("Deleted empty DO");
}
main().catch(console.error).finally(() => prisma.$disconnect());
