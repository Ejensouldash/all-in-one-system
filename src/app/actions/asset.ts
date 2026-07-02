"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { AssetStatus, AssetType } from "@prisma/client"

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
