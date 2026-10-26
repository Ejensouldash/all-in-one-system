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
const PER_DEPT = 40;

// Official order; LGL, PME, SEC excluded by request
const TARGET_CODES = ["BDD", "PRD-R", "PRD-P", "OSD", "MKT-A", "MKT-S", "MNT", "LNW", "CPD", "ITD", "HRD", "HSE", "FIN", "SOD"];

const tagFor = (n) => `AST-${String(n).padStart(4, "0")}`;

async function blankCounts() {
  const rows = await prisma.asset.groupBy({ by: ["departmentId"], where: { name: BLANK_NAME }, _count: true });
  return Object.fromEntries(rows.map((r) => [r.departmentId, r._count]));
}

function astNumbers(tags) {
  return tags.filter((t) => /^AST-\d+$/.test(t)).map((t) => parseInt(t.slice(4), 10)).sort((a, b) => a - b);
}

async function run() {
  console.log(`=== Add ${PER_DEPT} Blank QRs per Department (${APPLY ? "APPLY" : "DRY-RUN"}) ===\n`);

  const depts = await prisma.department.findMany();
  const byCode = Object.fromEntries(depts.map((d) => [d.code, d]));
  for (const code of TARGET_CODES) {
    if (!byCode[code]) throw new Error(`Department ${code} not found`);
  }

  const tags = (await prisma.asset.findMany({ select: { assetTag: true } })).map((a) => a.assetTag);
  const totalBefore = tags.length;
  const nums = astNumbers(tags);
  const start = (nums[nums.length - 1] || 0) + 1;
  const blanksBefore = await blankCounts();

  const rows = [];
  const plan = [];
  let n = start;
  for (const code of TARGET_CODES) {
    const dept = byCode[code];
    const from = n;
    for (let k = 0; k < PER_DEPT; k++, n++) {
      rows.push({
        assetTag: tagFor(n),
        name: BLANK_NAME,
        brand: null,
        serialNumber: null,
        condition: "Unregistered",
        description: `Blank QR code sticker pre-allocated for ${code} (${dept.name}). Ready for on-site tagging and registration.`,
        departmentId: dept.id,
        status: "AVAILABLE",
        type: "OTHER",
      });
    }
    const before = blanksBefore[dept.id] || 0;
    plan.push({ Code: code, Name: dept.name, Tags: `${tagFor(from)} - ${tagFor(n - 1)}`, "Blank before": before, "Blank after": before + PER_DEPT });
  }

  const tagSet = new Set(tags);
  const clashes = rows.filter((r) => tagSet.has(r.assetTag));
  if (clashes.length) throw new Error(`Tag clash: ${clashes.map((r) => r.assetTag).join(", ")}`);

  console.log(`Total assets: ${totalBefore}. Creating ${rows.length} blanks: ${rows[0].assetTag} - ${rows[rows.length - 1].assetTag}`);
  console.table(plan);

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write changes.");
    return;
  }

  const created = await prisma.$transaction(async (tx) => tx.asset.createMany({ data: rows }), { timeout: 60000 });
  console.log(`\nCreated ${created.count} blank QR assets`);

  // Verify
  console.log("\n=== Verification ===");
  const tagsAfter = (await prisma.asset.findMany({ select: { assetTag: true } })).map((a) => a.assetTag);
  const numsAfter = astNumbers(tagsAfter);
  const blanksAfter = await blankCounts();
  const sequential = numsAfter.length === tagsAfter.length && numsAfter.every((v, i) => v === i + 1);

  const checks = [
    [`total assets = ${totalBefore + rows.length}`, tagsAfter.length === totalBefore + rows.length],
    [`AST tags continuous 1..${tagsAfter.length} with no gaps/duplicates`, sequential],
    ...TARGET_CODES.map((code) => {
      const id = byCode[code].id;
      return [`${code} blanks +${PER_DEPT}`, (blanksAfter[id] || 0) - (blanksBefore[id] || 0) === PER_DEPT];
    }),
    ...depts
      .filter((d) => !TARGET_CODES.includes(d.code))
      .map((d) => [`${d.code} unchanged (${blanksBefore[d.id] || 0})`, (blanksAfter[d.id] || 0) === (blanksBefore[d.id] || 0)]),
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
