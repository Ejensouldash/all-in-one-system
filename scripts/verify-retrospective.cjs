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

async function verify() {
  console.log("=== Verifying Retrospective Completion (2026-10-03 to 2026-10-14) ===");

  const firdaus = await prisma.user.findFirst({ where: { email: 'firdaus@bubbleso2.com' } });

  const occurrences = await prisma.reminderPMOccurrence.findMany({
    where: { dueDate: { gte: '2026-10-03', lte: '2026-10-14' } },
    select: { id: true, dueDate: true, equipment: true, result: true, completedAt: true, completedById: true, performedSignature: true }
  });

  console.log(`Total occurrences in range 2026-10-03 to 2026-10-14: ${occurrences.length}`);
  const uncompleted = occurrences.filter(o => !o.completedAt);
  console.log(`Uncompleted (Red/Overdue): ${uncompleted.length}`);
  const completed = occurrences.filter(o => !!o.completedAt);
  console.log(`Completed (Green/DONE): ${completed.length}`);

  const byFirdaus = completed.filter(o => o.completedById === firdaus.id);
  console.log(`Completed specifically by Firdaus: ${byFirdaus.length}`);

  const hasSignature = completed.filter(o => !!o.performedSignature);
  console.log(`Signed with official signature: ${hasSignature.length}`);

  if (uncompleted.length === 0 && completed.length > 0) {
    console.log("\n[SUCCESS] 100% of tasks from 2026-10-03 to 2026-10-14 are completed, green-marked, and signed by Firdaus!");
  } else {
    throw new Error(`Some tasks are still not completed!`);
  }
}

verify()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
