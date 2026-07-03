const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.transferIn.findMany({ include: { items: true } });
  console.log(JSON.stringify(all, null, 2));
}
main();
