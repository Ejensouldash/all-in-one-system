const path = require('path');
const appDir = 'c:\\Users\\user\\Documents\\All in One System';
require(path.join(appDir, 'node_modules', 'dotenv')).config({ path: path.join(appDir, '.env'), override: true });
const { Pool } = require(path.join(appDir, 'node_modules', 'pg'));
const { PrismaPg } = require(path.join(appDir, 'node_modules', '@prisma', 'adapter-pg'));
const { PrismaClient } = require(path.join(appDir, 'node_modules', '@prisma', 'client'));

let connectionString = process.env.DATABASE_URL || "";
if (connectionString.includes("pooler.supabase.com")) {
  connectionString = connectionString.replace(":5432/", ":6543/");
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
}
const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Completing PMC Tasks (2026-10-03 to 2026-10-14) as Firdaus ===");

  const firdaus = await prisma.user.findFirst({
    where: { email: 'firdaus@bubbleso2.com' }
  });
  if (!firdaus) throw new Error("User firdaus@bubbleso2.com not found!");

  const signature = firdaus.signatureUrl || `/api/users/${firdaus.id}/signature`;
  console.log(`PIC: ${firdaus.name} (${firdaus.email})`);
  console.log(`Using Signature: ${signature}`);

  const targetOccurrences = await prisma.reminderPMOccurrence.findMany({
    where: {
      dueDate: { gte: '2026-10-03', lte: '2026-10-14' },
      completedAt: null
    },
    select: {
      id: true,
      dueDate: true,
      equipment: true,
      checklist: true
    },
    orderBy: { dueDate: 'asc' }
  });

  console.log(`Found ${targetOccurrences.length} uncompleted occurrences to complete.`);

  let completedCount = 0;
  for (const occ of targetOccurrences) {
    const inspectedDate = occ.dueDate;
    const completedAt = new Date(`${occ.dueDate}T09:30:00+08:00`);

    await prisma.reminderPMOccurrence.update({
      where: { id: occ.id },
      data: {
        result: "OK",
        notes: "Routine maintenance completed and inspected in good order.",
        inspectedDate,
        performedSignature: signature,
        completedChecklist: occ.checklist || [],
        completedById: firdaus.id,
        completedAt
      }
    });
    completedCount++;
  }

  console.log(`Successfully completed and green-marked ${completedCount} tasks as ${firdaus.name}!`);

  // Verify remaining uncompleted tasks before 2026-10-15
  const remainingOverdue = await prisma.reminderPMOccurrence.count({
    where: {
      dueDate: { gte: '2026-10-03', lte: '2026-10-14' },
      completedAt: null
    }
  });
  console.log(`Remaining uncompleted/overdue tasks for 2026-10-03 to 2026-10-14: ${remainingOverdue}`);

  // Summary counts
  const totalCompleted = await prisma.reminderPMOccurrence.count({
    where: {
      completedAt: { not: null }
    }
  });
  console.log(`Total completed PMC occurrences in database: ${totalCompleted}`);
}

main()
  .catch(err => {
    console.error("Error executing completion:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
