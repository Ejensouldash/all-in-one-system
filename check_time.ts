import { prisma } from './src/lib/prisma';

async function main() {
  const report = await prisma.dailyReport.findUnique({
    where: { id: "5563d4ee-b5c5-42de-bace-1093eb2c6f42" } // The ID from earlier screenshots
  });
  console.log("Time string in DB:", JSON.stringify(report?.time));
  console.log("Report Time string in DB:", JSON.stringify(report?.reportTime));
  console.log("Prepared Signature:", report?.preparedSignature ? "EXISTS" : "MISSING");
  console.log("Verified Signature:", report?.verifiedSignature ? "EXISTS" : "MISSING");
}

main().catch(console.error);
