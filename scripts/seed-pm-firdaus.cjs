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

function addDays(date, days) {
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
}

function occurrenceDate(rule, index) {
  if (rule.intervalUnit === "MON_SAT") {
    const weeks = Math.floor(index / 6);
    const dayOffset = index % 6;
    return addDays(rule.startDate, weeks * 7 + dayOffset);
  }
  if (rule.intervalUnit === "DAY") return addDays(rule.startDate, index * rule.intervalCount);
  const [year, month, day] = rule.startDate.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + index * rule.intervalCount, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}

function datesBetween(rule, from, to) {
  if (rule.intervalUnit === "MON_SAT") {
    const result = [];
    let current = rule.startDate > from ? rule.startDate : from;
    while (current <= to) {
      if (current >= rule.startDate) {
        const dow = new Date(current + "T00:00:00Z").getUTCDay();
        if (dow !== 0) { // skip Sunday
          result.push(current);
        }
      }
      current = addDays(current, 1);
    }
    return result;
  }
  const result = [];
  for (let i = 0; i < 8000; i++) {
    const date = occurrenceDate(rule, i);
    if (date > to) break;
    if (date >= from) result.push(date);
  }
  return result;
}

const NEW_SCHEDULES = [
  // ==========================================
  // GROUP 1: SATURDAY (Start: 2026-10-03)
  // Water System & Water Treatment (Zone A, B, C, D)
  // ==========================================
  {
    sourceKey: "pm:zone-a:well",
    equipment: "Zone A: Well",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 84, // 12 Weeks (3 Months)
    checklist: [
      "Flushing",
      "Monitor well flowrate and water clarity (If low flowrate or dirty water: Change pump)"
    ]
  },
  {
    sourceKey: "pm:zone-a:raw-tank",
    equipment: "Zone A: Raw Tank",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Clean tank, chemical cleaning (specialist team)"
    ]
  },
  {
    sourceKey: "pm:zone-a:transfer-pump",
    equipment: "Zone A: Transfer Pump (Well 12-1 unit; Well 7 8-1 unit)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Check terminal pump (If faulty: Replace pump and record issue in inspection form)"
    ]
  },
  {
    sourceKey: "pm:zone-a:crystal-ball",
    equipment: "Zone A: Crystal Ball - 4 units (Well 3, 4, 7&8, 2)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Change Crystal Ball (CB) media"
    ]
  },
  {
    sourceKey: "pm:zone-b:sand-filter",
    equipment: "Zone B: Sand Filter",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 168, // 24 Weeks (6 Months)
    checklist: [
      "Replace filter media / cartridge"
    ]
  },
  {
    sourceKey: "pm:zone-b:carbon-filter",
    equipment: "Zone B: Carbon Filter",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 168, // 24 Weeks (6 Months)
    checklist: [
      "Replace filter media / cartridge"
    ]
  },
  {
    sourceKey: "pm:zone-b:precision-filter",
    equipment: "Zone B: Precision Filter (5 & 10 micron)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 168, // 24 Weeks (6 Months)
    checklist: [
      "Replace filter (5 & 10 micron)"
    ]
  },
  {
    sourceKey: "pm:zone-b:hollow-membrane",
    equipment: "Zone B: Hollow Membrane",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 168, // 24 Weeks (6 Months)
    checklist: [
      "Replace filter / membrane"
    ]
  },
  {
    sourceKey: "pm:zone-b:pump-transfer",
    equipment: "Zone B: Transfer Pump",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Check terminal pump (If faulty: Replace pump and record issue in inspection form)"
    ]
  },
  {
    sourceKey: "pm:zone-b:uv-unit",
    equipment: "Zone B: UV Unit",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Check UV lamp and illumination"
    ]
  },
  {
    sourceKey: "pm:zone-c:filtered-tank",
    equipment: "Zone C: Filtered Tank",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Clean tank interior and surface"
    ]
  },
  {
    sourceKey: "pm:zone-c:piping-filtered-rinsing",
    equipment: "Zone C: Filtered Piping & Rinsing",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Cleaning piping and rinse"
    ]
  },
  {
    sourceKey: "pm:zone-d:sand-filter",
    equipment: "Zone D: Sand Filter (RO System)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 168, // 24 Weeks (6 Months)
    checklist: [
      "Replace filter"
    ]
  },
  {
    sourceKey: "pm:zone-d:carbon-filter",
    equipment: "Zone D: Carbon Filter (RO System)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 168, // 24 Weeks (6 Months)
    checklist: [
      "Replace filter"
    ]
  },
  {
    sourceKey: "pm:zone-d:uv-unit",
    equipment: "Zone D: UV Unit (RO System)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Check UV lamp and illumination"
    ]
  },
  {
    sourceKey: "pm:zone-d:transfer-pump",
    equipment: "Zone D: Transfer Pump - 3 units (RO System)",
    srs: null,
    startDate: "2026-10-03",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Check terminal pump (3 units) (If faulty: Replace pump and record issue in inspection form)"
    ]
  },

  // ==========================================
  // GROUP 2: SUNDAY (Start: 2026-10-04)
  // Packaging & Compressor Machinery (Zone E, F)
  // ==========================================
  {
    sourceKey: "pm:zone-e:blower",
    equipment: "Zone E: Blower",
    srs: null,
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Clean blower housing and fan"
    ]
  },
  {
    sourceKey: "pm:zone-e:3in1-steam-cleaning",
    equipment: "Zone E: 3 in 1 Machine",
    srs: "Steam Cleaning",
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 7, // 1 Week
    checklist: [
      "Perform steam cleaning on 3 in 1 machine"
    ]
  },
  {
    sourceKey: "pm:zone-e:3in1-grease-sanitising",
    equipment: "Zone E: 3 in 1 Machine",
    srs: "Grease & Sanitising",
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 14, // 2 Weeks
    checklist: [
      "Grease rotating components",
      "Full cleaning and sanitising"
    ]
  },
  {
    sourceKey: "pm:zone-e:precision-filter",
    equipment: "Zone E: Precision Filter",
    srs: null,
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 28, // 4 Weeks (1 Month)
    checklist: [
      "Replace filter cartridge"
    ]
  },
  {
    sourceKey: "pm:zone-f:labelling-machine",
    equipment: "Zone F: Labelling Machine",
    srs: null,
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 14, // 2 Weeks
    checklist: [
      "Grease mechanical parts and lubricate"
    ]
  },
  {
    sourceKey: "pm:zone-f:robotic-arm",
    equipment: "Zone F: Robotic Arm Machine",
    srs: null,
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 14, // 2 Weeks
    checklist: [
      "Lubricate robotic arm joints with oil"
    ]
  },
  {
    sourceKey: "pm:zone-f:air-compressor",
    equipment: "Zone F: Air Compressor (3 units)",
    srs: null,
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 42, // 6 Weeks (~350 Operating Hours)
    checklist: [
      "Replace filter (Check operating hours meter; replace if reaching 300-400 hours)"
    ]
  },
  {
    sourceKey: "pm:zone-f:air-tubing",
    equipment: "Zone F: Air Tubing",
    srs: null,
    startDate: "2026-10-04",
    intervalUnit: "DAY",
    intervalCount: 84, // 12 Weeks (3 Months)
    checklist: [
      "Replace compressed air tubing"
    ]
  },

  // ==========================================
  // GROUP 3: DAILY ROUTINES (Start: Monday, 2026-10-05)
  // Plant Operations (Monday to Saturday)
  // ==========================================
  {
    sourceKey: "pm:zone-a:daily-routine",
    equipment: "Zone A: Daily Routine (Well & Raw Tank)",
    srs: "Daily Routine",
    startDate: "2026-10-05",
    intervalUnit: "MON_SAT",
    intervalCount: 1,
    checklist: [
      "Crystal Ball: Backwash (Daily until clear)",
      "Sand filter (well 12, 7, 8): Backwash (Daily until clear)"
    ]
  },
  {
    sourceKey: "pm:zone-b:daily-routine",
    equipment: "Zone B: Daily Routine (Water Filtration System)",
    srs: "Daily Routine",
    startDate: "2026-10-05",
    intervalUnit: "MON_SAT",
    intervalCount: 1,
    checklist: [
      "Sand filter: Backwash",
      "Carbon filter: Backwash",
      "Precision filter (5 & 10 micron): Backwash",
      "Hollow membrane: Backwash",
      "UV unit: Check hazard"
    ]
  },
  {
    sourceKey: "pm:zone-d:daily-routine",
    equipment: "Zone D: Daily Routine (RO System)",
    srs: "Daily Routine",
    startDate: "2026-10-05",
    intervalUnit: "MON_SAT",
    intervalCount: 1,
    checklist: [
      "PP RO filter: Change filter",
      "Sand filter: Backwash",
      "Carbon filter: Backwash",
      "RO unit: Monitor conductivity"
    ]
  },
  {
    sourceKey: "pm:zone-e:daily-routine",
    equipment: "Zone E: Daily Routine (Autoscrambler & 3 in 1 Machine)",
    srs: "Daily Routine",
    startDate: "2026-10-05",
    intervalUnit: "MON_SAT",
    intervalCount: 1,
    checklist: [
      "Autoscrambler: Clean area",
      "Rail blower: Clean rail",
      "Precision filter: Drain stagnant water"
    ]
  }
];

async function main() {
  console.log("=== Starting PM Migration / Seed to En. Firdaus Official PDF ===");

  // Find admin user to attribute creation
  const firdaus = await prisma.user.findFirst({
    where: { email: { contains: "firdaus" } }
  });
  const iskandar = await prisma.user.findFirst({
    where: { email: { contains: "iskandar" } }
  });
  const createdById = firdaus?.id || iskandar?.id || (await prisma.user.findFirst()).id;
  console.log("Using creator ID:", createdById);

  // 1. Archive old active schedules
  const oldActiveSchedules = await prisma.reminderPMSchedule.findMany({
    where: { archivedAt: null }
  });
  console.log(`Found ${oldActiveSchedules.length} existing active schedules to archive.`);

  await prisma.$transaction(async (tx) => {
    // Lock PM
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73032026)`;

    // Archive old schedules
    if (oldActiveSchedules.length > 0) {
      await tx.reminderPMSchedule.updateMany({
        where: { archivedAt: null },
        data: { archivedAt: new Date() }
      });
      // Delete uncompleted occurrences from old schedules
      const delOcc = await tx.reminderPMOccurrence.deleteMany({
        where: {
          scheduleId: { in: oldActiveSchedules.map(s => s.id) },
          completedAt: null
        }
      });
      console.log(`Archived ${oldActiveSchedules.length} schedules and removed ${delOcc.count} pending occurrences.`);
    }

    // 2. Create the 28 new schedules
    const createdSchedules = [];
    for (const item of NEW_SCHEDULES) {
      const schedule = await tx.reminderPMSchedule.create({
        data: {
          sourceKey: item.sourceKey,
          equipment: item.equipment,
          srs: item.srs,
          startDate: item.startDate,
          intervalUnit: item.intervalUnit,
          intervalCount: item.intervalCount,
          activationDate: item.startDate,
          generationFrom: item.startDate,
          checklist: item.checklist,
          picIds: [], // Flexible PIC assignment
          createdById: createdById,
        }
      });
      createdSchedules.push(schedule);
    }
    console.log(`Successfully created ${createdSchedules.length} new PMC schedules.`);

    // 3. Materialize occurrences through 2026-12-31 (~75 days ahead)
    const throughDate = "2026-12-31";
    console.log(`Materializing occurrences from start through ${throughDate}...`);
    let totalOccurrences = 0;
    for (const schedule of createdSchedules) {
      const from = schedule.startDate;
      const dates = datesBetween(schedule, from, throughDate);
      if (dates.length > 0) {
        await tx.reminderPMOccurrence.createMany({
          data: dates.map(dueDate => ({
            scheduleId: schedule.id,
            dueDate,
            equipment: schedule.equipment,
            srs: schedule.srs,
            checklist: schedule.checklist,
            picIds: schedule.picIds
          })),
          skipDuplicates: true
        });
        totalOccurrences += dates.length;
      }
    }
    console.log(`Materialized ${totalOccurrences} occurrences for 28 schedules through ${throughDate}.`);
  }, { timeout: 60000 });

  console.log("=== Seed Completed Successfully! ===");
}

main()
  .catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
