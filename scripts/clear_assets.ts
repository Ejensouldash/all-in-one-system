import { prisma } from '../src/lib/prisma';

async function clearAssets() {
  console.log("Unlinking existing Assets from Tickets...");
  await prisma.ticket.updateMany({
    data: { linkedAssetId: null }
  });
  
  console.log("Deleting AssetLogs...");
  await prisma.$executeRawUnsafe(`DELETE FROM "AssetLog"`);
  
  console.log("Deleting existing Assets...");
  await prisma.$executeRawUnsafe(`DELETE FROM "Asset"`);
  console.log("Cleared.");
}

clearAssets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
