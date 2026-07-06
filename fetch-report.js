const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const report = await prisma.dailyReport.findUnique({ 
    where: { id: '33c3b9e0-5590-47fd-a73d-45f2487a5be3' }, 
    include: { productions: { include: { batches: true } }, rejects: true, breakdowns: true, inventory: true } 
  });
  console.log(JSON.stringify(report, null, 2));
}
main().finally(() => prisma.$disconnect());
