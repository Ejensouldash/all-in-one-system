"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { AssetStatus, AssetType } from "@prisma/client"
import { uploadMaintenanceItemPhoto } from "@/lib/maintenance-r2"

export async function getNextAssetTag(): Promise<string> {
  try {
    const latestAsset = await prisma.asset.findFirst({
      where: {
        assetTag: {
          startsWith: "AST-"
        }
      },
      orderBy: {
        assetTag: "desc"
      }
    })

    let nextNumber = 1
    if (latestAsset) {
      const numPart = latestAsset.assetTag.replace("AST-", "")
      const parsed = parseInt(numPart, 10)
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1
      }
    }

    return `AST-${String(nextNumber).padStart(4, "0")}`
  } catch (err) {
    console.error("Failed to generate next asset tag:", err)
    return `AST-${String(Date.now()).slice(-4)}`
  }
}

export async function generateAssetTag(departmentId: string | null, assetType: string) {
  try {
    const tag = await getNextAssetTag()
    return { success: true, tag }
  } catch (error: any) {
    console.error("Failed to generate asset tag:", error)
    return { success: false, error: "Failed to generate tag" }
  }
}

export async function uploadAssetPhotoAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("photo") as File
    if (!file) {
      return { success: false, error: "No photo file provided." }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadMaintenanceItemPhoto(buffer, file.name, file.type || "image/jpeg")

    return { success: true, url }
  } catch (error: any) {
    console.error("Failed to upload asset photo:", error)
    return { success: false, error: error.message || "Failed to upload photo." }
  }
}

export async function createAsset(data: any) {
  try {
    const tag = data.assetTag || (await getNextAssetTag())

    let status = (data.status as AssetStatus) || AssetStatus.AVAILABLE
    if (!data.status && data.condition) {
      if (data.condition === "Bad") status = AssetStatus.MAINTENANCE
      else if (data.condition === "Unused") status = AssetStatus.RETIRED
    }

    const asset = await prisma.asset.create({
      data: {
        assetTag: tag,
        name: data.name,
        brand: data.brand || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        description: data.description || null,
        condition: data.condition || null,
        imageUrl: data.imageUrl || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        price: data.price ? parseFloat(data.price) : null,
        plateNumber: data.plateNumber || null,
        status: status,
        type: (data.type as AssetType) || AssetType.OTHER,
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
    let status = data.status as AssetStatus | undefined
    if (!status && data.condition) {
      if (data.condition === "Bad") status = AssetStatus.MAINTENANCE
      else if (data.condition === "Unused") status = AssetStatus.RETIRED
      else if (data.condition === "Good" || data.condition === "Usable") status = AssetStatus.AVAILABLE
    }

    const updateData: any = {
      name: data.name,
      brand: data.brand !== undefined ? data.brand : undefined,
      model: data.model !== undefined ? data.model : undefined,
      serialNumber: data.serialNumber !== undefined ? data.serialNumber : undefined,
      description: data.description !== undefined ? data.description : undefined,
      condition: data.condition !== undefined ? data.condition : undefined,
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : (data.purchaseDate === null ? null : undefined),
      price: data.price !== undefined ? (data.price ? parseFloat(data.price) : null) : undefined,
      plateNumber: data.plateNumber !== undefined ? data.plateNumber : undefined,
      departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
      locationId: data.locationId !== undefined ? data.locationId : undefined,
    }

    if (status) {
      updateData.status = status
    }
    if (data.type) {
      updateData.type = data.type as AssetType
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData
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
