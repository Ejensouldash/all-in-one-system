import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { assets } = await request.json();
    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
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

    for (const row of assets) {
      let deptId = null;
      if (row.departmentCode) {
        // Find or create department
        let dept = await prisma.department.findUnique({
          where: { code: row.departmentCode }
        });
        if (!dept && row.departmentName) {
           dept = await prisma.department.create({
             data: { name: row.departmentName, code: row.departmentCode }
           });
        }
        if (dept) deptId = dept.id;
      }

      let locationId = null;
      if (row.location) {
        let loc = await prisma.location.findFirst({
          where: { name: row.location }
        });
        if (!loc) {
          loc = await prisma.location.create({
            data: { name: row.location }
          });
        }
        locationId = loc.id;
      }

      let prefix = '';
      if (row.departmentCode && row.departmentCode !== 'FUR') {
        prefix = `${row.departmentCode}-${row.categoryCode}`;
      } else {
        prefix = `${row.categoryCode}`;
      }
      
      if (row.departmentCode === 'FUR') {
        prefix = `FUR`; 
      }

      const assetTag = getNextTag(prefix);

      try {
        await prisma.asset.create({
          data: {
            assetTag,
            name: row.name || 'Unknown Asset',
            brand: row.brand || null,
            model: row.model || null,
            serialNumber: row.serialNumber || null,
            deviceId: row.deviceId || null,
            description: row.description || null,
            type: row.type || 'OTHER',
            status: 'AVAILABLE',
            departmentId: deptId,
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
    console.error("Import Confirm API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
