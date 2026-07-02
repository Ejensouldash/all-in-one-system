import { AssetStatus, AssetType } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import { prisma } from '../src/lib/prisma';

// Utility to convert Excel serial dates to JS Date
function excelDateToJSDate(serial: number) {
  if (!serial || typeof serial !== 'number') return null;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  return new Date(utc_value * 1000);
}

// Map textual status to Enum
function mapStatus(rawStatus: string): AssetStatus {
  if (!rawStatus) return AssetStatus.AVAILABLE;
  const s = rawStatus.toLowerCase();
  if (s.includes('occup') || s.includes('assign')) return AssetStatus.ASSIGNED;
  if (s.includes('free') || s.includes('avail')) return AssetStatus.AVAILABLE;
  if (s.includes('maint') || s.includes('repair')) return AssetStatus.MAINTENANCE;
  if (s.includes('retire') || s.includes('scrap') || s.includes('dispose')) return AssetStatus.RETIRED;
  return AssetStatus.AVAILABLE;
}

// Map item name to Type Enum
function mapType(itemName: string): AssetType {
  if (!itemName) return AssetType.OTHER;
  const i = itemName.toLowerCase();
  
  if (i.includes('phone') || i.includes('laptop') || i.includes('pc') || i.includes('monitor') || i.includes('desktop') || i.includes('ipad') || i.includes('tablet') || i.includes('printer')) {
    return AssetType.IT_EQUIPMENT;
  }
  if (i.includes('lorry') || i.includes('car') || i.includes('van') || i.includes('truck') || i.includes('forklift')) {
    return AssetType.VEHICLE;
  }
  if (i.includes('machine') || i.includes('pump') || i.includes('compressor') || i.includes('chiller')) {
    return AssetType.MACHINERY;
  }
  if (i.includes('chair') || i.includes('desk') || i.includes('table') || i.includes('cabinet') || i.includes('furniture')) {
    return AssetType.FURNITURE;
  }
  if (i.includes('extinguisher') || i.includes('safety') || i.includes('first aid')) {
    return AssetType.SAFETY;
  }
  return AssetType.OTHER;
}

// Parse price from messy strings like "RM 399 - RM 449" or "400.00"
function parsePrice(raw: any): number | null {
  if (!raw) return null;
  if (typeof raw === 'number') return raw;
  const str = String(raw).replace(/[^0-9.-]+/g, " ");
  const numbers = str.trim().split(" ").map(Number).filter(n => !isNaN(n));
  if (numbers.length > 0) return numbers[0]; // Just take the first valid number for simplicity
  return null;
}

async function main() {
  console.log("Starting Asset Migration...");
  
  const filePath = path.join(process.cwd(), "public/assets/Master List Aset bubblesO2.xlsx");
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`Found ${rows.length} rows to migrate.`);

  // To prevent unique constraint errors if running multiple times
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.department.deleteMany();
  await prisma.location.deleteMany();

  let count = 0;
  for (const row of rows) {
    count++;
    // Extract raw fields
    const rawItem = row['Item'] || row['Title'] || `Unknown Item ${count}`;
    const rawBrand = row['Brand']?.toString();
    const rawModel = row['Model/Version']?.toString();
    const rawSerial = row['Serial No']?.toString();
    const rawDeviceID = row['Device ID']?.toString();
    const rawLocation = row['Location: Name'] || row['Location'] || 'HQ';
    const rawStatus = row['Current Usage'] || row['Condition'];
    const rawPIC = row['User/PIC'];
    const rawPrice = row['Product Price'] || row['ProductPrice'] || row['ProductPrice0'];
    const rawDate = row['Date of Purchase'];
    const rawSupplier = row['Supplier'];
    const rawPlate = row['Plate Number'];
    const rawDept = row['Department'] || row['Department.1'] || 'General';
    const rawTag = row['Compliance Asset Id'] || `AST-${Date.now()}-${count}`;
    const rawDesc = row['Description'];

    // Find or Create Department
    let department = await prisma.department.findUnique({ where: { name: rawDept }});
    if (!department) {
      department = await prisma.department.create({ data: { name: rawDept }});
    }

    // Find or Create Location
    // Assuming location names are unique enough for this script
    let location = await prisma.location.findFirst({ where: { name: rawLocation }});
    if (!location) {
      location = await prisma.location.create({ data: { name: rawLocation }});
    }

    // Process Date
    const purchaseDate = typeof rawDate === 'number' ? excelDateToJSDate(rawDate) : null;

    // Create Asset
    const asset = await prisma.asset.create({
      data: {
        assetTag: rawTag.toString(),
        name: rawItem.toString(),
        brand: rawBrand,
        model: rawModel,
        serialNumber: rawSerial,
        deviceId: rawDeviceID,
        description: rawDesc?.toString(),
        type: mapType(rawItem.toString()),
        status: mapStatus(rawStatus?.toString()),
        purchaseDate,
        price: parsePrice(rawPrice),
        supplier: rawSupplier?.toString(),
        plateNumber: rawPlate?.toString(),
        departmentId: department.id,
        locationId: location.id
      }
    });

    // Handle PIC Assignment
    if (rawPIC && rawPIC.toString().trim() !== '') {
      // Find user if exists (simple fuzzy match)
      const user = await prisma.user.findFirst({
        where: { name: { contains: rawPIC.toString().trim(), mode: 'insensitive' } }
      });

      if (user) {
        await prisma.assetAssignment.create({
          data: {
            assetId: asset.id,
            userId: user.id,
            remarks: "Legacy assignment imported from Excel"
          }
        });
      }
    }
  }

  console.log(`Successfully migrated ${count} assets!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
