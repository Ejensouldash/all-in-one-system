import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';

const DEPT_MAP: Record<string, string> = {
  'Human Resources': 'HRD',
  'Human Resources (HR)': 'HRD',
  'Finance': 'FIN',
  'Legal': 'LGL',
  'Corporate': 'COR',
  'Marketing Activation': 'MKT',
  'Business Development and Sales': 'BDS',
  'Logistic and Warehouse': 'LWH',
  'Online Sales': 'OLS',
  'Sales Ordering': 'SOR',
  'Health and Safety Environment': 'HSE',
  'Information Technology': 'ITD',
  'IT': 'ITD',
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

// Simplify department matching
function matchDeptName(rawDept: string) {
  const s = (rawDept || '').toLowerCase().trim();
  for (const [key, code] of Object.entries(DEPT_MAP)) {
    if (s === key.toLowerCase() || s.includes(key.toLowerCase()) || key.toLowerCase().includes(s)) {
      return { name: key, code };
    }
  }
  return null;
}

function guessCategory(item: string, desc: string) {
  const i = (item || '').toLowerCase();
  const d = (desc || '').toLowerCase();
  const text = i + ' ' + d;

  if (text.includes('laptop') || text.includes('handphone') || text.includes('desktop') || text.includes('printer') || text.includes('mouse') || text.includes('monitor') || text.includes('macbook') || text.includes('ipad') || text.includes('pc') || text.includes('tablet')) return { type: 'ICT_EQUIPMENT', code: 'ICT' };
  if (text.includes('chair') || text.includes('table') || text.includes('cabinet') || text.includes('sofa') || text.includes('meja') || text.includes('kerusi')) return { type: 'FURNITURE', code: 'FUR' };
  if (text.includes('vehicle') || text.includes('lorry') || text.includes('car') || text.includes('van') || text.includes('motor')) return { type: 'VEHICLE', code: 'VEH' };
  if (text.includes('khemah') || text.includes('event') || text.includes('ice box') || text.includes('poleystrene')) return { type: 'EVENT_EQUIPMENT', code: 'EVT' };
  if (text.includes('machine') || text.includes('pump') || text.includes('compressor')) return { type: 'MACHINE', code: 'MCH' };
  if (text.includes('safety') || text.includes('fire extinguisher') || text.includes('ppe')) return { type: 'SAFETY_EQUIPMENT', code: 'SAF' };
  if (text.includes('drill') || text.includes('grinder') || text.includes('tools')) return { type: 'TOOLS', code: 'TOL' };
  if (text.includes('aircond') || text.includes('fridge') || text.includes('fan') || text.includes('electrical')) return { type: 'ELECTRICAL_EQUIPMENT', code: 'ELE' };
  
  return { type: 'OTHER', code: 'OTH' };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

    // Ensure departments exist
    const departmentsCache: Record<string, any> = {};
    for (const [name, code] of Object.entries(DEPT_MAP)) {
      const dept = await prisma.department.upsert({
        where: { name },
        update: { code },
        create: { name, code }
      });
      departmentsCache[code] = dept;
    }

    // Determine current highest running numbers to continue tag generation
    const existingAssets = await prisma.asset.findMany({ select: { assetTag: true } });
    const counters: Record<string, number> = {};
    
    for (const a of existingAssets) {
      const parts = a.assetTag.split('-');
      if (parts.length >= 2) {
        const numPart = parts[parts.length - 1];
        const prefix = parts.slice(0, parts.length - 1).join('-');
        const n = parseInt(numPart, 10);
        if (!isNaN(n)) {
          counters[prefix] = Math.max(counters[prefix] || 0, n);
        }
      }
    }

    function getNextTag(prefix: string) {
      if (!counters[prefix]) counters[prefix] = 0;
      counters[prefix]++;
      const runningNo = String(counters[prefix]).padStart(4, '0');
      return `${prefix}-${runningNo}`;
    }

    let successCount = 0;

    for (const row of data) {
      // Handle both formats: "Master List" format and "aset it.xlsx" format
      let rawDept = row['Department'] || row['DEPARTMENT'] || '';
      
      const deptMatch = matchDeptName(rawDept);
      const dept = deptMatch ? departmentsCache[deptMatch.code] : null;
      const deptCode = deptMatch ? deptMatch.code : null;

      // Extract item name and description
      const itemName = row['Item'] || row['CATEGORY'] || 'Unknown Asset';
      const itemDesc = row['Description'] || row['MODEL'] || '';

      const { type, code: catCode } = guessCategory(itemName, itemDesc);

      let prefix = '';
      if (deptCode && deptCode !== 'FUR') {
        prefix = `${deptCode}-${catCode}`;
      } else {
        prefix = `${catCode}`;
      }
      
      if (deptCode === 'FUR') {
        prefix = `FUR`; 
      }

      const assetTag = getNextTag(prefix);

      const sn = row['Serial No'] || row['SERIAL NUMBER'] || '-';
      const brand = row['Brand'] || row['BRAND'] || '-';
      const model = row['Model/Version'] || row['MODEL'] || '-';
      const descText = (row['Description'] || '') + (row['ASSIGNED TO'] ? `\nAssigned To: ${row['ASSIGNED TO']}` : '');
      const locationName = row['LOCATION'] ? String(row['LOCATION']) : null;
      
      let locationId = null;
      if (locationName) {
        let loc = await prisma.location.findFirst({
          where: { name: locationName }
        });
        if (!loc) {
          loc = await prisma.location.create({
            data: { name: locationName }
          });
        }
        locationId = loc.id;
      }

      try {
        await prisma.asset.create({
          data: {
            assetTag,
            name: itemName,
            brand: brand !== '-' ? brand : null,
            model: model !== '-' ? model : null,
            serialNumber: sn !== '-' ? sn : null,
            deviceId: row['Device ID'] || row['BARCODE'] || null,
            description: descText || null,
            type: type as any,
            status: 'AVAILABLE',
            departmentId: dept ? dept.id : null,
            locationId: locationId,
          }
        });
        successCount++;
      } catch (e: any) {
        console.error(`Failed to create ${assetTag}:`, e.message);
      }
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error: any) {
    console.error("Import API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
