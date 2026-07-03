const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.transferInItem.deleteMany({
    where: {
      batchNo: {
        startsWith: 'B8/'
      }
    }
  });
  console.log(`Deleted ${result.count} items starting with B8/`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
