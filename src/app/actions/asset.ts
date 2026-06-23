"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createAsset(formData: FormData) {
  const session = await auth()
  
  // IT Staff Check
  let isIT = false
  if (session?.user.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: session.user.unitId } })
    isIT = unit?.name === "Information Technology"
  }

  if (session?.user.role !== "SUPERADMIN" && !isIT) return { success: false, error: "Unauthorized" }

  const category = formData.get("category") as string || "General"
  const brand = formData.get("brand") as string || "Generic"
  const model = formData.get("model") as string || "Unknown"
  const serialNumber = formData.get("serialNumber") as string
  const barcode = formData.get("barcode") as string
  const location = formData.get("location") as string
  const status = formData.get("status") as any || "ACTIVE"
  const unitId = formData.get("unitId") as string
  const assigneeName = formData.get("assigneeName") as string

  try {
    await prisma.asset.create({
      data: {
        category,
        brand,
        model,
        serialNumber: serialNumber || null,
        barcode: barcode || null,
        location: location || null,
        status,
        unitId: unitId || null,
        assigneeName: assigneeName || null,
      }
    })
    
    revalidatePath("/assets")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function bulkImportAssets(data: any[]) {
  const session = await auth()
  
  if (session?.user.role !== "SUPERADMIN") {
    return { success: false, error: "Unauthorized access. Only SuperAdmins can import assets." }
  }

  try {
    let importedCount = 0

    for (const row of data) {
      // Handle both "ASSIGNED TO" (with space) and "ASSIGNED_TO" (with underscore)
      const rawAssignee = row["ASSIGNED TO"] || row.ASSIGNED_TO
      let assigneeName = null
      if (rawAssignee) {
        assigneeName = String(rawAssignee)
      }

      // Find Unit ID if DEPARTMENT is provided
      let unitId = null
      if (row.DEPARTMENT) {
        const unit = await prisma.unit.findFirst({
          where: { name: { contains: String(row.DEPARTMENT), mode: "insensitive" } }
        })
        if (unit) unitId = unit.id
      }

      // Safe Enum parsing
      let status: "ACTIVE" | "BROKEN" | "MAINTENANCE" = "ACTIVE"
      if (row.STATUS) {
        const parsedStatus = String(row.STATUS).toUpperCase()
        if (["ACTIVE", "BROKEN", "MAINTENANCE"].includes(parsedStatus)) {
          status = parsedStatus as any
        }
      }

      const rawSerial = row["SERIAL NUMBER"] || row.SERIAL_NUMBER

      await prisma.asset.create({
        data: {
          category: String(row.CATEGORY || "General Equipment"),
          brand: String(row.BRAND || "Generic"),
          model: String(row.MODEL || "Unknown"),
          serialNumber: rawSerial ? String(rawSerial) : null,
          barcode: row.BARCODE ? String(row.BARCODE) : null,
          location: row.LOCATION ? String(row.LOCATION) : null,
          status,
          assigneeName,
          unitId
        }
      })
      importedCount++
    }

    return { success: true, count: importedCount }
  } catch (error: any) {
    console.error("Bulk import failed:", error)
    return { success: false, error: error.message || "Failed to process import" }
  }
}

export async function deleteAsset(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    const linkedTickets = await prisma.ticket.count({ where: { linkedAssetId: id } })
    if (linkedTickets > 0) return { success: false, error: `Cannot delete asset. It is linked to ${linkedTickets} tickets.` }

    await prisma.asset.delete({ where: { id } })
    revalidatePath("/assets")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateAssetAssignment(id: string, assigneeName: string | null) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    await prisma.asset.update({
      where: { id },
      data: { assigneeName: assigneeName || null }
    })
    revalidatePath("/assets")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function addAssetLog(assetId: string, formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  const action = formData.get("action") as string
  const description = formData.get("description") as string
  const newStatus = formData.get("newStatus") as string

  if (!action || !description) throw new Error("Missing fields")

  await prisma.$transaction(async (tx) => {
    // Create Log
    await tx.assetLog.create({
      data: {
        assetId,
        action,
        description,
        performedBy: session.user.name
      }
    })

    // Update Status if provided
    if (newStatus) {
      await tx.asset.update({
        where: { id: assetId },
        data: { status: newStatus as any }
      })
    }
  })

  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
  revalidatePath('/dashboard')
}

export async function updateAsset(formData: FormData) {
  const session = await auth()
  
  // IT Staff Check
  let isIT = false
  if (session?.user.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: session.user.unitId } })
    isIT = unit?.name === "Information Technology"
  }

  if (session?.user.role !== "SUPERADMIN" && !isIT) throw new Error("Unauthorized")

  const id = formData.get("id") as string
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const serialNumber = formData.get("serialNumber") as string
  const barcode = formData.get("barcode") as string
  const category = formData.get("category") as string
  const status = formData.get("status") as string
  const unitId = formData.get("unitId") as string
  const assigneeName = formData.get("assigneeName") as string

  await prisma.asset.update({
    where: { id },
    data: {
      brand,
      model,
      serialNumber,
      barcode,
      category,
      status: status as any,
      unitId: unitId || null,
      assigneeName: assigneeName || null,
    }
  })

  revalidatePath("/assets")
}
