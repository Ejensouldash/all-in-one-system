const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

let cs = process.env.DATABASE_URL || "";
if (cs.includes("pooler.supabase.com")) {
  cs = cs.replace(":5432/", ":6543/");
  if (!cs.includes("pgbouncer=true")) cs += cs.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
}
const pool = new Pool({ connectionString: cs });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const APPLY = process.argv.includes("--apply");
const BLANK_NAME = "[Blank QR - Ready to Register]";

// Official department list (Oct 2026) + LGL, PME, SEC kept as-is
const OFFICIAL_DEPTS = [
  { code: "BDD", name: "Business Development Department" },
  { code: "PRD-R", name: "Production Rantau" },
  { code: "PRD-P", name: "Production Pedas" },
  { code: "OSD", name: "Online Sales Department" },
  { code: "MKT-A", name: "Marketing Activation" },
  { code: "MKT-S", name: "Marketing Social Media" },
  { code: "MNT", name: "Maintenance" },
  { code: "LNW", name: "Logistics and Warehouse" },
  { code: "CPD", name: "Corporate Department" },
  { code: "ITD", name: "Information Technology Department" },
  { code: "HRD", name: "Human Resources Department" },
  { code: "HSE", name: "Health & Safety" },
  { code: "FIN", name: "Finance Department" },
  { code: "SOD", name: "Sales Ordering Department" },
  { code: "LGL", name: "Legal" },
  { code: "PME", name: "Petrol Mart Engagement" },
  { code: "SEC", name: "Security Department" },
];
const KEEP_CODES = new Set(OFFICIAL_DEPTS.map((d) => d.code));

const RENAMES = [{ from: "CORP", to: "CPD" }];
const MOVES = [
  { from: "KAR", to: "PRD-R" },
  { from: "KBP", to: "PRD-P" },
];

const blankDescription = (code, name) =>
  `Blank QR code sticker pre-allocated for ${code} (${name}). Ready for on-site tagging and registration.`;

async function snapshot(client) {
  const depts = await client.department.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { code: "asc" },
  });
  const blanks = await client.asset.groupBy({ by: ["departmentId"], where: { name: BLANK_NAME }, _count: true });
  const blankMap = Object.fromEntries(blanks.map((b) => [b.departmentId, b._count]));
  return depts.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    total: d._count.assets,
    blank: blankMap[d.id] || 0,
    real: d._count.assets - (blankMap[d.id] || 0),
  }));
}

function printSnapshot(rows) {
  console.table(rows.map(({ id, ...r }) => r));
}

async function run() {
  console.log(`=== Department Realignment (${APPLY ? "APPLY" : "DRY-RUN"}) ===\n`);

  const before = await snapshot(prisma);
  const byCode = Object.fromEntries(before.filter((d) => d.code).map((d) => [d.code, d]));
  const totalBefore = await prisma.asset.count();
  console.log(`Total assets: ${totalBefore}`);
  printSnapshot(before);

  // Sanity: every source/target must exist
  for (const { from, to } of [...RENAMES, ...MOVES]) {
    if (!byCode[from]) throw new Error(`Source department ${from} not found`);
    if (MOVES.some((m) => m.to === to) && !byCode[to]) throw new Error(`Target department ${to} not found`);
  }
  if (byCode["CPD"]) throw new Error("A CPD department already exists; resolve manually before renaming CORP");

  // Expected end-state counts
  const expected = {
    CPD: byCode["CORP"].total,
    "PRD-R": byCode["PRD-R"].total + byCode["KAR"].total,
    "PRD-P": byCode["PRD-P"].total + byCode["KBP"].total,
  };
  const toDelete = before.filter((d) => !KEEP_CODES.has(d.code) && !RENAMES.some((r) => r.from === d.code));

  console.log("\nPlanned changes:");
  for (const r of RENAMES) console.log(`  RENAME ${r.from} "${byCode[r.from].name}" -> ${r.to}`);
  for (const m of MOVES) console.log(`  MOVE   ${byCode[m.from].total} assets ${m.from} -> ${m.to}`);
  console.log(`  DELETE ${toDelete.length} departments: ${toDelete.map((d) => d.code ?? `(null) ${d.name}`).join(", ")}`);
  console.log("  Expected counts after:", expected);

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write changes.");
    return;
  }

  // Backup
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilePath = path.join(backupDir, `dept-realign-backup-${timestamp}.json`);
  const assets = await prisma.asset.findMany({ include: { department: true, location: true } });
  const departments = await prisma.department.findMany();
  fs.writeFileSync(backupFilePath, JSON.stringify({ departments, assets }, null, 2), "utf8");
  console.log(`\nBackup written to: ${backupFilePath}`);

  const officialName = Object.fromEntries(OFFICIAL_DEPTS.map((d) => [d.code, d.name]));

  await prisma.$transaction(
    async (tx) => {
      for (const { from, to } of RENAMES) {
        const dept = await tx.department.update({
          where: { id: byCode[from].id },
          data: { code: to, name: officialName[to] },
        });
        const res = await tx.asset.updateMany({
          where: { departmentId: dept.id, name: BLANK_NAME },
          data: { description: blankDescription(to, officialName[to]) },
        });
        console.log(`Renamed ${from} -> ${to} (${res.count} blank descriptions updated)`);
      }

      for (const { from, to } of MOVES) {
        const target = byCode[to];
        const moved = await tx.asset.updateMany({
          where: { departmentId: byCode[from].id },
          data: { departmentId: target.id },
        });
        const res = await tx.asset.updateMany({
          where: { departmentId: target.id, name: BLANK_NAME, description: { contains: `for ${from} (` } },
          data: { description: blankDescription(to, target.name) },
        });
        console.log(`Moved ${moved.count} assets ${from} -> ${to} (${res.count} blank descriptions updated)`);
      }

      for (const d of toDelete) {
        const count = await tx.asset.count({ where: { departmentId: d.id } });
        if (count > 0) throw new Error(`Department ${d.code} still has ${count} assets; aborting`);
        await tx.department.delete({ where: { id: d.id } });
      }
      console.log(`Deleted ${toDelete.length} empty departments`);
    },
    { timeout: 60000 }
  );

  // Verify
  console.log("\n=== Verification ===");
  const after = await snapshot(prisma);
  const totalAfter = await prisma.asset.count();
  const noDept = await prisma.asset.count({ where: { departmentId: null } });
  printSnapshot(after);

  const afterByCode = Object.fromEntries(after.map((d) => [d.code, d]));
  const checks = [
    [`total assets unchanged (${totalBefore})`, totalAfter === totalBefore],
    ["no assets without department", noDept === 0],
    [`exactly ${KEEP_CODES.size} departments`, after.length === KEEP_CODES.size],
    ["all departments are official", after.every((d) => KEEP_CODES.has(d.code))],
    ["all names match official list", after.every((d) => d.name === officialName[d.code])],
    ...Object.entries(expected).map(([code, n]) => [`${code} = ${n}`, afterByCode[code]?.total === n]),
  ];
  let ok = true;
  for (const [label, pass] of checks) {
    console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
    if (!pass) ok = false;
  }
  if (!ok) process.exitCode = 1;
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
