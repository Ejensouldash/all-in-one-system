import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

    const departmentsCache: Record<string, any> = {};
    const locationsCache: Record<string, any> = {};

    let successCount = 0;

    for (const row of assets) {
      let deptId = null;
      if (row.departmentCode) {
        if (departmentsCache[row.departmentCode]) {
          deptId = departmentsCache[row.departmentCode].id;
        } else {
          // Find or create department safely
          let dept = await prisma.department.findFirst({
            where: {
              OR: [
                { code: row.departmentCode },
                { name: row.departmentName }
              ]
            }
          });
          if (!dept && row.departmentName) {
            try {
              dept = await prisma.department.create({
                data: { name: row.departmentName, code: row.departmentCode }
              });
            } catch (err: any) {
              // If concurrent creation happened, just find it
              dept = await prisma.department.findFirst({
                where: { name: row.departmentName }
              });
            }
          }
          if (dept) {
            departmentsCache[row.departmentCode] = dept;
            deptId = dept.id;
          }
        }
      }

      let locationId = null;
      if (row.location) {
        if (locationsCache[row.location]) {
          locationId = locationsCache[row.location].id;
        } else {
          let loc = await prisma.location.findFirst({
            where: { name: row.location }
          });
          if (!loc) {
            try {
              loc = await prisma.location.create({
                data: { name: row.location }
              });
            } catch (err: any) {
              loc = await prisma.location.findFirst({
                where: { name: row.location }
              });
            }
          }
          if (loc) {
            locationsCache[row.location] = loc;
            locationId = loc.id;
          }
        }
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
