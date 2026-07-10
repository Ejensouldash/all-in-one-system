import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'syazwani@bubbleso2.com' } });
  console.log(user);
}
main();
