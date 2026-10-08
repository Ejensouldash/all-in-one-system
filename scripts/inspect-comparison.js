const dotenv = require("dotenv");
dotenv.config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");

let cs = process.env.DATABASE_URL || "";
if (cs.includes("pooler.supabase.com")) {
  cs = cs.replace(":5432/", ":6543/");
  if (!cs.includes("pgbouncer=true")) cs += "?pgbouncer=true";
}
const pool = new Pool({ connectionString: cs });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function inspect() {
  const wb = XLSX.readFile("C:\\Users\\user\\Downloads\\Asset Tagging (1).xlsx");
  const excelRows = XLSX.utils.sheet_to_json(wb.Sheets["Combined Assets"]);

  console.log("=== EXCEL ROW ITEMS BY DEPT ===");
  const excelByDept = {};
  excelRows.forEach((r) => {
    const d = r.Department || "BLANK";
    if (!excelByDept[d]) excelByDept[d] = [];
    excelByDept[d].push(r);
  });

  for (const [dept, rows] of Object.entries(excelByDept)) {
    console.log(`\n--- [Excel] ${dept}: ${rows.length} items ---`);
    const sampleItems = rows.slice(0, 3).map((r) => r.Item || r.item || "N/A").join(", ");
    console.log(`Sample items: ${sampleItems}`);
    const locations = Array.from(new Set(rows.map((r) => r.Location).filter(Boolean)));
    console.log(`Locations (${locations.length}): ${locations.slice(0, 5).join(" | ")}`);
  }

  console.log("\n=== DB ASSETS BY DEPT ===");
  const dbAssets = await prisma.asset.findMany({
    include: { department: true, location: true },
  });

  const dbByDept = {};
  dbAssets.forEach((a) => {
    const d = a.department ? `${a.department.code || "NO_CODE"} - ${a.department.name}` : "NO_DEPT";
    if (!dbByDept[d]) dbByDept[d] = { total: 0, ast: 0, legacy: 0 };
    dbByDept[d].total++;
    if (a.assetTag.startsWith("AST-")) dbByDept[d].ast++;
    else dbByDept[d].legacy++;
  });

  console.table(
    Object.entries(dbByDept).map(([dept, stats]) => ({
      Department: dept,
      "Total in DB": stats.total,
      "Excel (AST-)": stats.ast,
      "Legacy/Other": stats.legacy,
    }))
  );

  console.log("\n=== EXCEL: Production Pedas items (20) ===");
  excelRows.filter(r => r.Department === "Production Pedas").forEach(r => {
    console.log(`[#${r.No}] ${r.Item} | Brand: ${r.Brand || "-"} | Serial: ${r["Barcode / Serial Number"] || "-"}`);
  });

  console.log("\n=== EXCEL: Production Rantau items (26) ===");
  excelRows.filter(r => r.Department === "Production Rantau").forEach(r => {
    console.log(`[#${r.No}] ${r.Item} | Brand: ${r.Brand || "-"} | Serial: ${r["Barcode / Serial Number"] || "-"}`);
  });

  console.log("\n=== DB: Legacy KBP items (code: KBP) ===");
  const kbpAssets = await prisma.asset.findMany({
    where: { department: { code: "KBP" } },
  });
  kbpAssets.forEach(a => console.log(`${a.assetTag} - ${a.name} (${a.type})`));

  console.log("\n=== DB: Legacy KAR items (code: KAR) ===");
  const karAssets = await prisma.asset.findMany({
    where: { department: { code: "KAR" } },
  });
  karAssets.forEach(a => console.log(`${a.assetTag} - ${a.name} (${a.type})`));

  console.log("\n=== MAPPING TO USER'S 18 STANDARDIZED DEPARTMENTS ===");
  const userDepts = [
    { code: "BDD", name: "Business Development Department" },
    { code: "PRD-R", name: "Production Rantau" },
    { code: "PRD-P", name: "Production Pedas" },
    { code: "OSD", name: "Online Sales Department" },
    { code: "MKT-A", name: "Marketing Activation" },
    { code: "MKT-S", name: "Marketing Social Media" },
    { code: "MNT", name: "Maintenance" },
    { code: "LNW", name: "Logistics and Warehouse" },
    { code: "KBP", name: "Kilang Botol Pedas" },
    { code: "KAR", name: "Kilang Air Rantau" },
    { code: "ITD", name: "Information Technology Department" },
    { code: "HRD", name: "Human Resources Department" },
    { code: "HSE", name: "Health & Safety" },
    { code: "FIN", name: "Finance Department" },
    { code: "SOD", name: "Sales Ordering Department" },
    { code: "LGL", name: "Legal" },
    { code: "PME", name: "Petrol Mart Engagement" },
    { code: "SEC", name: "Security Department" },
  ];

  console.table(userDepts);
}

inspect()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
