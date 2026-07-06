import { prisma } from './src/lib/prisma';

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: "Created Transfer In DO",
      createdAt: {
        gte: new Date("2026-07-03T00:00:00.000Z")
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`Found ${logs.length} logs for today.`);
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] ${l.details}`)
  })
}
main().catch(console.error).finally(() => prisma.$disconnect());
