const dotenv = require("dotenv");
dotenv.config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");

let connectionString = process.env.DATABASE_URL || "";
if (connectionString.includes("pooler.supabase.com")) {
  connectionString = connectionString.replace(":5432/", ":6543/");
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== EXCEL FILE ANALYSIS ===");
  const excelPath = "C:\\Users\\user\\Downloads\\Asset Tagging (1).xlsx";
  const workbook = XLSX.readFile(excelPath);
  console.log("Sheet names:", workbook.SheetNames);

  // Check each sheet
  const excelDeptStats = {};
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`\nSheet: "${sheetName}" (${rows.length} rows)`);
    if (rows.length > 0) {
      const depts = {};
      rows.forEach((r) => {
        const d = r.Department || r.department || r.Dept || r.dept || "NO_DEPT";
        depts[d] = (depts[d] || 0) + 1;
      });
      console.table(Object.entries(depts).map(([Department, Count]) => ({ Department, Count })));
      if (sheetName === "Combined Assets") {
        Object.assign(excelDeptStats, depts);
      }
    }
  }

  console.log("\n=== DATABASE ASSET ANALYSIS ===");
  const assets = await prisma.asset.findMany({
    include: { department: true, location: true },
  });
  console.log("Total Assets in DB:", assets.length);

  const dbCounts = {};
  for (const a of assets) {
    const code = a.department?.code || "NONE";
    const name = a.department?.name || "No Department";
    const key = `${code} | ${name}`;
    dbCounts[key] = (dbCounts[key] || 0) + 1;
  }
  console.table(Object.entries(dbCounts).map(([DeptKey, Count]) => ({ DeptKey, Count })));

  console.log("\n=== ALL DEPARTMENTS IN DB ===");
  const allDepts = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });
  console.table(
    allDepts.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
    }))
  );

  // Check Location breakdown for Furniture Assets or Production
  const furnitureAssets = assets.filter(
    (a) => a.department?.name.toLowerCase().includes("furniture")
  );
  if (furnitureAssets.length > 0) {
    console.log(`\n=== FURNITURE ASSETS BREAKDOWN BY LOCATION (${furnitureAssets.length} items) ===`);
    const furnLocs = {};
    for (const fa of furnitureAssets) {
      const loc = fa.location?.name || "No Location";
      furnLocs[loc] = (furnLocs[loc] || 0) + 1;
    }
    console.table(Object.entries(furnLocs).map(([Location, Count]) => ({ Location, Count })));
  }

  // Check Corporate breakdown
  const corpAssets = assets.filter(
    (a) => a.department?.name.toLowerCase().includes("corporate")
  );
  if (corpAssets.length > 0) {
    console.log(`\n=== CORPORATE ASSETS (${corpAssets.length} items) ===`);
    corpAssets.forEach((ca) => {
      console.log(`- ${ca.assetTag}: ${ca.name} (Location: ${ca.location?.name})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
