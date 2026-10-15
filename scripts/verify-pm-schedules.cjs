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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function verify() {
  console.log("=== Verifying PMC Schedules & Occurrences Integrity ===");

  const activeSchedules = await prisma.reminderPMSchedule.findMany({
    where: { archivedAt: null },
    include: { occurrences: true },
    orderBy: { startDate: "asc" }
  });

  console.log(`Active schedules count: ${activeSchedules.length} (Expected: 28)`);
  if (activeSchedules.length !== 28) {
    throw new Error(`Expected 28 active schedules, found ${activeSchedules.length}`);
  }

  let satOccurrences = 0;
  let sunOccurrences = 0;
  let dailyOccurrences = 0;
  let errors = 0;

  for (const s of activeSchedules) {
    const isSatGroup = ["pm:zone-a:", "pm:zone-b:", "pm:zone-c:", "pm:zone-d:"].some(k => s.sourceKey.startsWith(k)) && !s.sourceKey.includes("daily-routine");
    const isSunGroup = ["pm:zone-e:", "pm:zone-f:"].some(k => s.sourceKey.startsWith(k)) && !s.sourceKey.includes("daily-routine");
    const isDaily = s.sourceKey.includes("daily-routine");

    for (const occ of s.occurrences) {
      const d = new Date(occ.dueDate + "T00:00:00Z");
      const dow = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      if (isSatGroup) {
        satOccurrences++;
        if (dow !== 6) {
          console.error(`ERROR: Saturday schedule ${s.equipment} has non-Saturday due date: ${occ.dueDate} (${DAY_NAMES[dow]})`);
          errors++;
        }
      } else if (isSunGroup) {
        sunOccurrences++;
        if (dow !== 0) {
          console.error(`ERROR: Sunday schedule ${s.equipment} has non-Sunday due date: ${occ.dueDate} (${DAY_NAMES[dow]})`);
          errors++;
        }
      } else if (isDaily) {
        dailyOccurrences++;
        if (dow === 0) {
          console.error(`ERROR: Daily routine ${s.equipment} has Sunday due date: ${occ.dueDate}`);
          errors++;
        }
      }
    }
  }

  console.log(`\n--- Verification Statistics ---`);
  console.log(`Saturday Occurrences: ${satOccurrences} (All verified falling strictly on SATURDAY)`);
  console.log(`Sunday Occurrences: ${sunOccurrences} (All verified falling strictly on SUNDAY)`);
  console.log(`Daily Occurrences (Mon-Sat): ${dailyOccurrences} (All verified skipping SUNDAY)`);
  console.log(`Total Violations / Day-Mismatch Errors: ${errors}`);

  if (errors > 0) {
    throw new Error(`Integrity check failed with ${errors} day violations!`);
  }

  console.log("\n[PASSED] All 28 PMC schedules conform strictly to weekend and Mon-Sat rules!");
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
