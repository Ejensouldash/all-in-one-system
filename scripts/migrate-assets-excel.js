const fs = require("fs");
const path = require("path");
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

async function runMigration() {
  console.log("=== Starting Asset Migration from Excel ===");

  // 1. Backup existing assets
  const existingAssets = await prisma.asset.findMany({
    include: {
      department: true,
      location: true,
    },
  });
  console.log(`Found ${existingAssets.length} existing assets to backup.`);

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilePath = path.join(backupDir, `assets-backup-${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(existingAssets, null, 2), "utf8");
  console.log(`Backup successfully written to: ${backupFilePath}`);

  // 2. Delete all existing assets
  console.log("Purging existing assets from database...");
  const deleteResult = await prisma.asset.deleteMany({});
  console.log(`Successfully deleted ${deleteResult.count} old assets.`);

  // 3. Read Excel file
  const excelPath = "C:\\Users\\user\\Downloads\\Asset Tagging (1).xlsx";
  console.log(`Reading Excel file: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets["Combined Assets"];
  if (!sheet) {
    throw new Error('Sheet "Combined Assets" not found in Excel!');
  }
  const rawRows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Loaded ${rawRows.length} rows from Excel.`);

  // 4. Resolve / Upsert Departments
  console.log("Resolving departments...");
  const deptMap = new Map(); // deptName -> deptId
  const excelDepts = Array.from(new Set(rawRows.map((r) => r.Department).filter(Boolean)));

  for (const deptName of excelDepts) {
    const trimmed = String(deptName).trim();
    let dept = await prisma.department.findUnique({
      where: { name: trimmed },
    });

    if (!dept) {
      // Check case-insensitive match
      const allDepts = await prisma.department.findMany();
      dept = allDepts.find((d) => d.name.toLowerCase() === trimmed.toLowerCase());
    }

    if (!dept) {
      // Create new department with code
      let code = trimmed.substring(0, 3).toUpperCase();
      let existingCode = await prisma.department.findFirst({ where: { code } });
      if (existingCode) {
        code = (trimmed.substring(0, 2) + trimmed.slice(-1)).toUpperCase();
      }
      existingCode = await prisma.department.findFirst({ where: { code } });
      if (existingCode) {
        code = null;
      }

      dept = await prisma.department.create({
        data: {
          name: trimmed,
          code: code,
        },
      });
      console.log(`Created new department: "${trimmed}" (ID: ${dept.id})`);
    } else {
      console.log(`Mapped department: "${trimmed}" -> "${dept.name}" (ID: ${dept.id})`);
    }
    deptMap.set(deptName, dept.id);
  }

  // 5. Resolve / Upsert Locations
  console.log("Resolving locations...");
  const locMap = new Map(); // locName -> locId
  const excelLocs = Array.from(new Set(rawRows.map((r) => r.Location).filter(Boolean)));

  for (const locName of excelLocs) {
    const trimmed = String(locName).trim();
    let loc = await prisma.location.findFirst({
      where: { name: trimmed },
    });

    if (!loc) {
      loc = await prisma.location.create({
        data: {
          name: trimmed,
        },
      });
      console.log(`Created location: "${trimmed}" (ID: ${loc.id})`);
    }
    locMap.set(locName, loc.id);
  }

  // 6. Ingest all 652 assets
  console.log("Ingesting assets into database...");
  let successCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
    const batch = rawRows.slice(i, i + BATCH_SIZE);
    const createPromises = batch.map((r, index) => {
      const overallIndex = i + index + 1;
      const rowNo = r.No !== undefined && r.No !== null ? Number(r.No) : overallIndex;
      const runningNoStr = String(rowNo).padStart(4, "0");
      const assetTag = `AST-${runningNoStr}`;

      const itemName = r.Item ? String(r.Item).trim() : `Asset #${rowNo}`;
      const brand = r.Brand ? String(r.Brand).trim() : null;
      const serialNumber = r["Barcode / Serial Number"] ? String(r["Barcode / Serial Number"]).trim() : null;
      const condition = r.Condition ? String(r.Condition).trim() : null;

      let status = "AVAILABLE";
      if (condition === "Bad") {
        status = "MAINTENANCE";
      } else if (condition === "Unused") {
        status = "RETIRED";
      }

      const departmentId = r.Department ? deptMap.get(r.Department) || null : null;
      const locationId = r.Location ? locMap.get(r.Location) || null : null;

      // Determine default AssetType based on item name and department
      let type = "OTHER";
      const itemLower = itemName.toLowerCase();
      const deptLower = (r.Department || "").toLowerCase();
      if (deptLower.includes("furniture") || itemLower.includes("meja") || itemLower.includes("kerusi") || itemLower.includes("cabinet") || itemLower.includes("kabinet") || itemLower.includes("rak")) {
        type = "FURNITURE";
      } else if (itemLower.includes("handphone") || itemLower.includes("laptop") || itemLower.includes("pc") || itemLower.includes("printer") || deptLower.includes("it")) {
        type = "ICT_EQUIPMENT";
      } else if (deptLower.includes("production") || itemLower.includes("machine") || itemLower.includes("motor") || itemLower.includes("pump")) {
        type = "MACHINE";
      }

      return prisma.asset.create({
        data: {
          assetTag,
          name: itemName,
          brand,
          serialNumber,
          condition,
          status,
          type,
          departmentId,
          locationId,
          description: null,
        },
      });
    });

    await Promise.all(createPromises);
    successCount += batch.length;
    console.log(`Processed ${successCount}/${rawRows.length} assets...`);
  }

  // 7. Verify counts
  const finalCount = await prisma.asset.count();
  console.log("=== Migration Completed Successfully ===");
  console.log(`Total Assets in Database: ${finalCount}`);
  console.log(`Backup File: ${backupFilePath}`);
}

runMigration()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
