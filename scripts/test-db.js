const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.transferInItem.findMany({ include: { transferIn: true } });
  console.log(JSON.stringify(items, null, 2));
}

main();
