import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const DEPT_MAP: Record<string, string> = {
  'Human Resources': 'HRD',
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

function guessCategory(item: string, desc: string) {
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
  
  return { type: 'OTHER', code: 'OTH' };
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'Master List Aset bubblesO2.xlsx');
    const fileBuffer = fs.readFileSync(filePath);
    const wb = xlsx.read(fileBuffer, { type: 'buffer' });
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

    const departmentsCache: Record<string, any> = {};
    const seenCodes = new Set<string>();

    for (const [name, code] of Object.entries(DEPT_MAP)) {
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);

      const dept = await prisma.department.upsert({
        where: { name },
        update: { code },
        create: { name, code }
      });
      departmentsCache[name] = dept;
    }

    const counters: Record<string, number> = {};

    function getNextTag(prefix: string) {
      if (!counters[prefix]) counters[prefix] = 0;
      counters[prefix]++;
      const runningNo = String(counters[prefix]).padStart(4, '0');
      return `${prefix}-${runningNo}`;
    }

    await prisma.asset.deleteMany({});

    let successCount = 0;
    for (const row of data) {
      let deptName = row['Department'] || '';
      
      if (!deptName && (row['User/PIC'] || '').toLowerCase().includes('marketing activation')) {
        deptName = 'Marketing Activation';
      }

      const dept = departmentsCache[deptName];
      const deptCode = dept ? dept.code : null;

      const { type, code: catCode } = guessCategory(row['Item'], row['Description']);

      let prefix = '';
      if (deptCode && deptCode !== 'FUR') {
        prefix = `${deptCode}-${catCode}`;
      } else {
        prefix = `${catCode}`;
      }
      
      if (deptCode === 'FUR' || deptName === 'Furniture Asset') {
        prefix = `FUR`; 
      }

      const assetTag = getNextTag(prefix);

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
            type: type as any,
            status: 'AVAILABLE',
            price: row['ProductPrice'] ? parseFloat(String(row['ProductPrice']).replace(/[^0-9.]/g, '')) || null : null,
            departmentId: dept ? dept.id : null,
            supplier: row['Supplier'] || null,
            warrantyInfo: row['Warranty'] || null,
          }
        });
        successCount++;
      } catch (e: any) {
        console.error(`Failed to create ${assetTag}:`, e.message);
      }
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
