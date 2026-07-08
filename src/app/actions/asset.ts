"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { AssetStatus, AssetType } from "@prisma/client"

const ASSET_TYPE_CODES: Record<string, string> = {
  'ICT_EQUIPMENT': 'ICT',
  'FURNITURE': 'FUR',
  'OFFICE_EQUIPMENT': 'OFF',
  'EVENT_EQUIPMENT': 'EVT',
  'VEHICLE': 'VEH',
  'TOOLS': 'TOL',
  'SAFETY_EQUIPMENT': 'SAF',
  'MACHINE': 'MCH',
  'ELECTRICAL_EQUIPMENT': 'ELE',
  'OTHER': 'OTH',
};

export async function generateAssetTag(departmentId: string | null, assetType: string) {
  try {
    let deptCode = null;
    
    if (departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      deptCode = dept?.code;
    }

    const typeCode = ASSET_TYPE_CODES[assetType] || 'OTH';

    let prefix = '';
    if (deptCode && deptCode !== 'FUR') {
      prefix = `${deptCode}-${typeCode}`;
    } else {
      // Missing department or Furniture shared
      prefix = typeCode;
      if (deptCode === 'FUR') {
        prefix = 'FUR';
      }
    }

    // Find latest tag with this prefix
    const latestAsset = await prisma.asset.findFirst({
      where: {
        assetTag: {
          startsWith: `${prefix}-`
        }
      },
      orderBy: {
        assetTag: 'desc'
      }
    });

    let nextNumber = 1;
    if (latestAsset) {
      const parts = latestAsset.assetTag.split('-');
      const lastPart = parts[parts.length - 1];
      const parsedNum = parseInt(lastPart, 10);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    const runningNo = String(nextNumber).padStart(4, '0');
    return { success: true, tag: `${prefix}-${runningNo}` };
  } catch (error: any) {
    console.error("Failed to generate asset tag:", error);
    return { success: false, error: "Failed to generate tag" };
  }
}
export async function createAsset(data: any) {
  try {
    const asset = await prisma.asset.create({
      data: {
        assetTag: data.assetTag,
        name: data.name,
        brand: data.brand || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        description: data.description || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        price: data.price ? parseFloat(data.price) : null,
        plateNumber: data.plateNumber || null,
        status: data.status as AssetStatus,
        type: data.type as AssetType,
        departmentId: data.departmentId || null,
        locationId: data.locationId || null,
      }
    })

    revalidatePath("/dashboard/assets")
    revalidatePath("/dashboard/assets/list")
    
    return { success: true, data: asset }
  } catch (error: any) {
    console.error("Failed to create asset:", error)
    if (error.code === 'P2002') {
      return { success: false, error: "Asset Tag already exists in the system." }
    }
    return { success: false, error: error.message || "Failed to create asset" }
  }
}

export async function updateAsset(id: string, data: any) {
  try {
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name: data.name,
        brand: data.brand || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        description: data.description || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        price: data.price ? parseFloat(data.price) : null,
        plateNumber: data.plateNumber || null,
        status: data.status as AssetStatus,
        type: data.type as AssetType,
        departmentId: data.departmentId || null,
        locationId: data.locationId || null,
      }
    })

    revalidatePath("/dashboard/assets")
    revalidatePath("/dashboard/assets/list")
    revalidatePath(`/dashboard/assets/${id}`)
    
    return { success: true, data: asset }
  } catch (error: any) {
    console.error("Failed to update asset:", error)
    return { success: false, error: error.message || "Failed to update asset" }
  }
}

export async function deleteAsset(id: string) {
  try {
    await prisma.asset.delete({
      where: { id }
    })
    revalidatePath("/dashboard/assets")
    revalidatePath("/dashboard/assets/list")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete asset" }
  }
}
