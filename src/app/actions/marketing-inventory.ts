"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getAccessInfo, canAccessMarketingInventory } from "@/lib/access"
import { logUserAction } from "./audit"
import { uploadMaintenanceItemPhoto } from "@/lib/maintenance-r2"

export async function getMarketingItems() {
  try {
    const items = await prisma.marketingItem.findMany({
      orderBy: { name: "asc" },
    })
    return { success: true, data: items }
  } catch (error: any) {
    console.error("Failed to fetch marketing items:", error)
    return { success: false, error: error.message }
  }
}

export async function addMarketingStock(data: {
  itemId: string | null
  name: string
  brand?: string | null
  category?: string | null
  quantity: number
  totalPrice: number
  unit: string
  handledBy: string
  remarks?: string
  location?: string
  department?: string
  imageUrl?: string | null
}) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingInventory(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_INVENTORY access." }
    }

    if (!data.quantity || data.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero." }
    }

    if (data.totalPrice === undefined || data.totalPrice === null || data.totalPrice <= 0) {
      return { success: false, error: "Total price is mandatory and must be greater than RM 0.00." }
    }

    const calculatedUnitPrice = Number((data.totalPrice / data.quantity).toFixed(4))
    const departmentVal = (data.department || "MARKETING").trim().toUpperCase()
    const categoryVal = (data.category || "MERCHANDISE").trim().toUpperCase()
    const brandUpper = data.brand?.trim().toUpperCase() || null

    const result = await prisma.$transaction(async (tx) => {
      let item
      let isNew = false

      if (data.itemId) {
        // Increment existing item
        const updateData: any = {
          quantity: { increment: data.quantity },
          pricePerUnit: calculatedUnitPrice,
        }
        if (data.department) updateData.department = departmentVal
        if (data.category) updateData.category = categoryVal
        if (brandUpper) updateData.brand = brandUpper
        if (data.imageUrl) updateData.imageUrl = data.imageUrl

        item = await tx.marketingItem.update({
          where: { id: data.itemId },
          data: updateData,
        })
      } else {
        // Create new item
        const normalizedName = data.name.trim().toUpperCase()
        const locationVal = data.location || "HQ Store"
        const existing = await tx.marketingItem.findUnique({
          where: {
            name_location: {
              name: normalizedName,
              location: locationVal,
            },
          },
        })

        if (existing) {
          throw new Error(
            `Marketing item "${normalizedName}" already exists in location "${locationVal}". Please select it from the list instead.`
          )
        }

        item = await tx.marketingItem.create({
          data: {
            name: normalizedName,
            brand: brandUpper,
            category: categoryVal,
            location: locationVal,
            department: departmentVal,
            quantity: data.quantity,
            unit: data.unit || "pcs",
            pricePerUnit: calculatedUnitPrice,
            imageUrl: data.imageUrl || null,
          },
        })
        isNew = true
      }

      // Create Stock Log
      await tx.marketingStockLog.create({
        data: {
          itemId: item.id,
          type: "IN",
          quantity: data.quantity,
          totalPrice: data.totalPrice,
          pricePerUnit: calculatedUnitPrice,
          department: item.department || departmentVal,
          handledBy: data.handledBy,
          remarks: data.remarks || null,
        },
      })

      return { item, isNew, unitPrice: calculatedUnitPrice }
    })

    revalidatePath("/business-development/marketing/inventory")
    revalidatePath("/marketing/inventory")

    // Log the user activity
    if (result.isNew) {
      await logUserAction(
        "Registered Marketing Asset/Item",
        `Created new marketing item: ${result.item.name} (${result.item.location}) with initial quantity of ${data.quantity} ${result.item.unit} at RM ${data.totalPrice.toFixed(2)}. Handled by: ${data.handledBy}.`
      )
    } else {
      await logUserAction(
        "Added Marketing Stock",
        `Added ${data.quantity} ${result.item.unit} to marketing item: ${result.item.name} (${result.item.location}) at RM ${data.totalPrice.toFixed(2)}. Handled by: ${data.handledBy}.`
      )
    }

    return { success: true, data: result.item }
  } catch (error: any) {
    console.error("Failed to add marketing stock:", error)
    return { success: false, error: error.message }
  }
}

export async function withdrawMarketingStock(data: {
  itemId: string
  quantity: number
  handledBy: string
  remarks?: string
}) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingInventory(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_INVENTORY access." }
    }

    if (data.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero." }
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.marketingItem.findUnique({
        where: { id: data.itemId },
      })

      if (!item) {
        throw new Error("Marketing item not found.")
      }

      if (item.quantity < data.quantity) {
        throw new Error(
          `Insufficient stock. Available: ${item.quantity} ${item.unit}, requested withdrawal: ${data.quantity} ${item.unit}.`
        )
      }

      const updatedItem = await tx.marketingItem.update({
        where: { id: data.itemId },
        data: {
          quantity: { decrement: data.quantity },
        },
      })

      const withdrawalTotal = Number((item.pricePerUnit * data.quantity).toFixed(2))
      await tx.marketingStockLog.create({
        data: {
          itemId: item.id,
          type: "OUT",
          quantity: data.quantity,
          pricePerUnit: item.pricePerUnit,
          totalPrice: withdrawalTotal,
          handledBy: data.handledBy,
          remarks: data.remarks || null,
        },
      })

      return updatedItem
    })

    revalidatePath("/business-development/marketing/inventory")
    revalidatePath("/marketing/inventory")

    await logUserAction(
      "Withdrew Marketing Stock",
      `Withdrew ${data.quantity} ${result.unit} from marketing item: ${result.name} (${result.location}). Handled by: ${data.handledBy}. Remarks: ${data.remarks || "-"}`
    )

    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to withdraw marketing stock:", error)
    return { success: false, error: error.message }
  }
}

export async function getMarketingStockReport(filters: {
  startDate?: string
  endDate?: string
  category?: string
}) {
  try {
    const where: any = {}

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    if (filters.category && filters.category !== "ALL") {
      where.item = {
        category: filters.category,
      }
    }

    const logs = await prisma.marketingStockLog.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: logs }
  } catch (error: any) {
    console.error("Failed to fetch marketing stock report:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteMarketingItem(itemId: string) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingInventory(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_INVENTORY access." }
    }

    const item = await prisma.marketingItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return { success: false, error: "Marketing item not found." }
    }

    await prisma.marketingItem.delete({
      where: { id: itemId },
    })

    revalidatePath("/business-development/marketing/inventory")
    revalidatePath("/marketing/inventory")

    await logUserAction("Deleted Marketing Item", `Deleted marketing item: ${item.name} (${item.location}).`)

    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete marketing item:", error)
    return { success: false, error: error.message }
  }
}

export async function getMarketingItemHistory(itemId: string) {
  try {
    const item = await prisma.marketingItem.findUnique({
      where: { id: itemId },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!item) {
      return { success: false, error: "Marketing item not found." }
    }

    return { success: true, data: item }
  } catch (error: any) {
    console.error("Failed to fetch marketing item history:", error)
    return { success: false, error: error.message }
  }
}

export async function uploadMarketingItemPhotoAction(formData: FormData) {
  try {
    const file = formData.get("photo") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "Please select an image file." }
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Image size must be less than 10MB." }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadMaintenanceItemPhoto(buffer, file.name, file.type || "image/jpeg")

    return { success: true, url }
  } catch (error: any) {
    console.error("Failed to upload marketing item photo:", error)
    return { success: false, error: error.message }
  }
}

export async function editMarketingItemMaster(
  itemId: string,
  data: {
    name: string
    brand?: string | null
    category?: string | null
    location?: string
    unit?: string
    pricePerUnit: number
    imageUrl?: string | null
  }
) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!canAccessMarketingInventory(access)) {
    return { success: false, error: "Unauthorized: Missing MARKETING_INVENTORY access." }
  }

  const nameUpper = data.name.trim().toUpperCase()
  if (!nameUpper) return { success: false, error: "Item name cannot be empty." }
  if (!Number.isFinite(data.pricePerUnit) || data.pricePerUnit < 0) {
    return { success: false, error: "Price per unit must be zero or greater." }
  }

  const locationVal = (data.location || "HQ Store").trim()
  const brandUpper = data.brand?.trim().toUpperCase() || null
  const categoryUpper = (data.category || "MERCHANDISE").trim().toUpperCase()
  const unitVal = (data.unit || "pcs").trim().toLowerCase()

  try {
    const existing = await prisma.marketingItem.findUnique({
      where: { id: itemId },
    })

    if (!existing) return { success: false, error: "Item not found." }

    if (existing.name !== nameUpper || existing.location !== locationVal) {
      const duplicate = await prisma.marketingItem.findUnique({
        where: {
          name_location: {
            name: nameUpper,
            location: locationVal,
          },
        },
      })
      if (duplicate && duplicate.id !== itemId) {
        return { success: false, error: `A marketing item named "${nameUpper}" already exists in location "${locationVal}".` }
      }
    }

    const updated = await prisma.marketingItem.update({
      where: { id: itemId },
      data: {
        name: nameUpper,
        brand: brandUpper,
        category: categoryUpper,
        location: locationVal,
        unit: unitVal,
        pricePerUnit: data.pricePerUnit,
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      },
    })

    revalidatePath("/business-development/marketing/inventory")
    revalidatePath("/marketing/inventory")

    await logUserAction(
      "Edited Marketing Item Master",
      `Renamed/updated marketing item ID ${itemId}: previous "${existing.name}" -> "${nameUpper}". Price/unit: RM ${existing.pricePerUnit.toFixed(4)} -> RM ${data.pricePerUnit.toFixed(4)}.${data.imageUrl === undefined ? "" : data.imageUrl ? " Image updated." : " Image removed."} Handled by: ${session.user.name || "User"}.`
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("editMarketingItemMaster error:", error)
    return { success: false, error: error.message || "Failed to update item master details." }
  }
}
