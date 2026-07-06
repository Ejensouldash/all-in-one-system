import { prisma } from './src/lib/prisma';

async function main() {
  await prisma.transferIn.delete({
    where: { id: "9edcdb23-c917-4501-a75e-774712cac9c3" }
  });
  console.log("Deleted duplicate DO - 20260702!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
