import { prisma } from './src/lib/prisma';

async function main() {
  const rejects = await prisma.rejectLog.findMany({ take: 5 });
  console.log("Rejects in DB:", JSON.stringify(rejects, null, 2));
}

main().catch(console.error);
