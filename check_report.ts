import { prisma } from './src/lib/prisma';

async function main() {
  const report = await prisma.dailyReport.findFirst({
    where: { 
      date: new Date("2026-07-03"),
      status: "PENDING"
    },
    include: { inventory: true }
  });

  if (!report) {
    console.log("No pending report found for 03/07/2026");
    return;
  }
  
  console.log("Found report:", report.id);
  console.log("Current inventory logs count:", report.inventory.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
