const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

// Manually initialize Prisma client for the script
const prisma = new PrismaClient();

const DEPT_MAP = {
  'Human Resources': 'HRD',
  'Finance': 'FIN',
  'Legal': 'LGL',
  'Corporate': 'COR',
  'Marketing Activation': 'MKT',
  'Marketing and Activation': 'MKT',
  'Business Development and Sales': 'BDS',
  'Logistic and Warehouse': 'LWH',
  'Online Sales': 'OLS',
  'Sales Ordering': 'SOR',
  'Health and Safety Environment': 'HSE',
  'Information Technology': 'ITD',
  'Maintenance and Facilities': 'MNT',
  'Security': 'SEC',
  'QA/QC': 'QAC',
  'Cari Gali': 'CGD',
  'Petrol Mart Engagement': 'PME',
  'Production Rantau': 'PRR',
  'Production Pedas': 'PPD',
  'Project': 'PRJ',
  'Personal Driver': 'DRV',
  'Furniture Asset': 'FUR',
};

// Map items to categories and their 3-letter codes
function guessCategory(item, desc) {
  const i = (item || '').toLowerCase();
  const d = (desc || '').toLowerCase();
  const text = i + ' ' + d;

  if (text.includes('laptop') || text.includes('handphone') || text.includes('desktop') || text.includes('printer') || text.includes('mouse') || text.includes('monitor') || text.includes('macbook') || text.includes('ipad')) return { type: 'ICT_EQUIPMENT', code: 'ICT' };
  if (text.includes('chair') || text.includes('table') || text.includes('cabinet') || text.includes('sofa') || text.includes('meja') || text.includes('kerusi')) return { type: 'FURNITURE', code: 'FUR' };
  if (text.includes('vehicle') || text.includes('lorry') || text.includes('car') || text.includes('van') || text.includes('motor')) return { type: 'VEHICLE', code: 'VEH' };
  if (text.includes('khemah') || text.includes('event') || text.includes('ice box') || text.includes('poleystrene')) return { type: 'EVENT_EQUIPMENT', code: 'EVT' };
  if (text.includes('machine') || text.includes('pump') || text.includes('compressor')) return { type: 'MACHINE', code: 'MCH' };
  if (text.includes('safety') || text.includes('fire extinguisher') || text.includes('ppe')) return { type: 'SAFETY_EQUIPMENT', code: 'SAF' };
  if (text.includes('drill') || text.includes('grinder') || text.includes('tools')) return { type: 'TOOLS', code: 'TOL' };
  if (text.includes('aircond') || text.includes('fridge') || text.includes('fan') || text.includes('electrical')) return { type: 'ELECTRICAL_EQUIPMENT', code: 'ELE' };
  
  // Default fallback
  return { type: 'OTHER', code: 'OTH' };
}

async function main() {
  console.log("Reading Master List...");
  const wb = xlsx.readFile(path.join(__dirname, '../public/assets/Master List Aset bubblesO2.xlsx'));
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`Found ${data.length} assets.`);

  // Sync Departments
  console.log("Syncing Departments...");
  const departmentsCache = {};
  for (const [name, code] of Object.entries(DEPT_MAP)) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: { code },
      create: { name, code }
    });
    departmentsCache[name] = dept;
  }

  // Counters for running numbers
  const counters = {};

  function getNextTag(prefix) {
    if (!counters[prefix]) counters[prefix] = 0;
    counters[prefix]++;
    const runningNo = String(counters[prefix]).padStart(4, '0');
    return `${prefix}-${runningNo}`;
  }

  console.log("Clearing existing assets to prevent duplicates (starting fresh)...");
  await prisma.asset.deleteMany({}); // Delete all existing to start fresh and avoid unique constraint issues

  let successCount = 0;
  for (const row of data) {
    let deptName = row['Department'] || '';
    
    // Check if Marketing Activation based on User
    if (!deptName && (row['User/PIC'] || '').toLowerCase().includes('marketing activation')) {
      deptName = 'Marketing Activation';
    }

    const dept = departmentsCache[deptName];
    const deptCode = dept ? dept.code : null;

    const { type, code: catCode } = guessCategory(row['Item'], row['Description']);

    // Determine Prefix
    let prefix = '';
    if (deptCode && deptCode !== 'FUR') {
      prefix = `${deptCode}-${catCode}`;
    } else {
      prefix = `${catCode}`;
    }
    
    // Exception for FUR
    if (deptCode === 'FUR' || deptName === 'Furniture Asset') {
      prefix = `FUR`; 
    }

    const assetTag = getNextTag(prefix);

    // Create Asset
    try {
      await prisma.asset.create({
        data: {
          assetTag,
          name: row['Item'] || 'Unknown Asset',
          brand: row['Brand'] || null,
          model: row['Model/Version'] || null,
          serialNumber: row['Serial No'] || null,
          deviceId: row['Device ID'] || null,
          description: row['Description'] || null,
          type,
          status: 'AVAILABLE',
          price: row['ProductPrice'] ? parseFloat(String(row['ProductPrice']).replace(/[^0-9.]/g, '')) || null : null,
          departmentId: dept ? dept.id : null,
          supplier: row['Supplier'] || null,
          warrantyInfo: row['Warranty'] || null,
        }
      });
      successCount++;
    } catch (e) {
      console.error(`Failed to create ${assetTag}:`, e.message);
    }
  }

  console.log(`Successfully imported ${successCount} assets.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
