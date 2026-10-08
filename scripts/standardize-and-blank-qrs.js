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

// The 19 standardized departments
const STANDARDIZED_DEPTS = [
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
  { code: "CORP", name: "Corporate" },
];

async function run() {
  console.log("=== STEP 1: Standardizing Department Table ===");
  const deptMap = {}; // code -> department record

  for (const item of STANDARDIZED_DEPTS) {
    // Check if department with code or name already exists
    let dept = await prisma.department.findFirst({
      where: {
        OR: [
          { code: item.code },
          { name: { equals: item.name, mode: "insensitive" } },
        ],
      },
    });

    if (dept) {
      // Update to standardized code & name
      dept = await prisma.department.update({
        where: { id: dept.id },
        data: {
          code: item.code,
          name: item.name,
        },
      });
      console.log(`Updated department: ${dept.code} - ${dept.name} (${dept.id})`);
    } else {
      dept = await prisma.department.create({
        data: {
          code: item.code,
          name: item.name,
        },
      });
      console.log(`Created department: ${dept.code} - ${dept.name} (${dept.id})`);
    }
    deptMap[item.code] = dept;
  }

  console.log("\n=== STEP 2: Purging 93 Legacy Assets (Non-AST tags) ===");
  const nonAstDelete = await prisma.asset.deleteMany({
    where: {
      NOT: {
        assetTag: { startsWith: "AST-" },
      },
    },
  });
  console.log(`Deleted ${nonAstDelete.count} legacy assets.`);

  console.log("\n=== STEP 3: Re-linking 652 Excel Assets to Standardized Departments ===");
  const wb = XLSX.readFile("C:\\Users\\user\\Downloads\\Asset Tagging (1).xlsx");
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets["Combined Assets"]);
  console.log(`Loaded ${rawRows.length} rows from Excel.`);

  let updatedCount = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNo = row.No !== undefined && row.No !== null ? Number(row.No) : i + 1;
    const runningNoStr = String(rowNo).padStart(4, "0");
    const assetTag = `AST-${runningNoStr}`;

    const excelDept = String(row.Department || "").trim();
    const excelLoc = String(row.Location || "").trim();

    let targetCode = "MNT"; // fallback
    if (excelDept === "Business Development") targetCode = "BDD";
    else if (excelDept === "Corporate") targetCode = "CORP";
    else if (excelDept === "Finance") targetCode = "FIN";
    else if (excelDept === "Health & Safety Environment") targetCode = "HSE";
    else if (excelDept === "Human Resources") targetCode = "HRD";
    else if (excelDept === "IT") targetCode = "ITD";
    else if (excelDept === "Logistic & Warehouse") targetCode = "LNW";
    else if (excelDept === "Maintenance & Facility") targetCode = "MNT";
    else if (excelDept === "Marketing & Activation") targetCode = "MKT-A";
    else if (excelDept === "Sales Ordering") targetCode = "SOD";
    else if (excelDept === "Production Pedas") targetCode = "PRD-P";
    else if (excelDept === "Production Rantau") targetCode = "PRD-R";
    else if (excelDept === "Furniture Assets") {
      if (excelLoc.includes("Marketing")) targetCode = "MKT-A";
      else if (excelLoc.includes("Admin & IT")) targetCode = "ITD";
      else if (excelLoc.includes("HR") && !excelLoc.includes("Finance & HR")) targetCode = "HRD";
      else if (excelLoc.includes("Finance") && !excelLoc.includes("Finance & HR")) targetCode = "FIN";
      else if (excelLoc.includes("Finance & HR")) targetCode = "HRD";
      else if (excelLoc.includes("Corporations") || excelLoc.includes("Managing Director")) targetCode = "CORP";
      else targetCode = "MNT"; // Common areas
    }

    const targetDept = deptMap[targetCode];
    if (targetDept) {
      await prisma.asset.updateMany({
        where: { assetTag },
        data: {
          departmentId: targetDept.id,
        },
      });
      updatedCount++;
    }
  }
  console.log(`Re-linked ${updatedCount} assets to standardized departments.`);

  console.log("\n=== STEP 4: Creating Blank QR Assets ===");
  // 0-asset depts get 20 blank QRs; other depts get 10 blank QRs
  const zeroAssetDepts = ["OSD", "MKT-S", "KBP", "KAR", "LGL", "PME", "SEC"];
  let blankCounter = 653; // Start running number after AST-0652
  let totalBlankCreated = 0;

  for (const item of STANDARDIZED_DEPTS) {
    const isZeroDept = zeroAssetDepts.includes(item.code);
    const countToCreate = isZeroDept ? 20 : 10;
    const targetDept = deptMap[item.code];

    console.log(`Generating ${countToCreate} Blank QRs for ${item.code} (${item.name})...`);

    for (let k = 1; k <= countToCreate; k++) {
      const runningNoStr = String(blankCounter).padStart(4, "0");
      const assetTag = `AST-${runningNoStr}`;
      blankCounter++;

      await prisma.asset.create({
        data: {
          assetTag,
          name: `[Blank QR - Ready to Register]`,
          brand: null,
          serialNumber: null,
          condition: "Unregistered",
          description: `Blank QR code sticker pre-allocated for ${item.code} (${item.name}). Ready for on-site tagging and registration.`,
          departmentId: targetDept.id,
          status: "AVAILABLE",
          type: "OTHER",
        },
      });
      totalBlankCreated++;
    }
  }
  console.log(`Successfully created ${totalBlankCreated} Blank QR assets in total!`);

  console.log("\n=== STEP 5: Verification & Summary ===");
  const finalAssets = await prisma.asset.findMany({
    include: { department: true },
  });
  console.log(`Total Assets in DB now: ${finalAssets.length} (652 real + ${totalBlankCreated} blank)`);

  const summary = {};
  for (const a of finalAssets) {
    const code = a.department?.code || "NO_CODE";
    if (!summary[code]) summary[code] = { real: 0, blank: 0, total: 0 };
    if (a.name === "[Blank QR - Ready to Register]") {
      summary[code].blank++;
    } else {
      summary[code].real++;
    }
    summary[code].total++;
  }

  console.table(
    STANDARDIZED_DEPTS.map((d) => ({
      Code: d.code,
      Name: d.name,
      "Real Assets": summary[d.code]?.real || 0,
      "Blank QRs": summary[d.code]?.blank || 0,
      "Total In System": summary[d.code]?.total || 0,
    }))
  );
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
