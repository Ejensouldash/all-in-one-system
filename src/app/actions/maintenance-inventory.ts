"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logUserAction } from "./audit"
import { uploadMaintenanceItemPhoto } from "@/lib/maintenance-r2"

export async function getMaintenanceItems() {
  try {
    const items = await prisma.maintenanceItem.findMany({
      orderBy: { name: "asc" }
    })
    return { success: true, data: items }
  } catch (error: any) {
    console.error("Failed to fetch maintenance items:", error)
    return { success: false, error: error.message }
  }
}

export async function addMaintenanceStock(data: {
  itemId: string | null
  name: string
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
    if (!data.quantity || data.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero." }
    }

    if (data.totalPrice === undefined || data.totalPrice === null || data.totalPrice <= 0) {
      return { success: false, error: "Total price is mandatory and must be greater than RM 0.00." }
    }

    const calculatedUnitPrice = Number((data.totalPrice / data.quantity).toFixed(4))
    const departmentVal = data.department || "BOS"

    const result = await prisma.$transaction(async (tx) => {
      let item;
      let isNew = false;

      if (data.itemId) {
        // Increment existing item and update unit price (and image/department if provided)
        const updateData: any = {
          quantity: { increment: data.quantity },
          pricePerUnit: calculatedUnitPrice,
        }
        if (data.department) {
          updateData.department = data.department
        }
        if (data.imageUrl) {
          updateData.imageUrl = data.imageUrl
        }

        item = await tx.maintenanceItem.update({
          where: { id: data.itemId },
          data: updateData
        })
      } else {
        // Create new item (check uniqueness first)
        const normalizedName = data.name.trim()
        const locationVal = data.location || "Pedas"
        const existing = await tx.maintenanceItem.findUnique({
          where: {
            name_location: {
              name: normalizedName,
              location: locationVal
            }
          }
        })

        if (existing) {
          throw new Error(`Item with name "${normalizedName}" already exists in location "${locationVal}". Please select it from the list instead.`)
        }

        item = await tx.maintenanceItem.create({
          data: {
            name: normalizedName,
            location: locationVal,
            department: departmentVal,
            quantity: data.quantity,
            unit: data.unit || "pcs",
            pricePerUnit: calculatedUnitPrice,
            imageUrl: data.imageUrl || null
          }
        })
        isNew = true;
      }

      // Create Stock Log with price details and department
      await tx.maintenanceStockLog.create({
        data: {
          itemId: item.id,
          type: "IN",
          quantity: data.quantity,
          totalPrice: data.totalPrice,
          pricePerUnit: calculatedUnitPrice,
          department: item.department || departmentVal,
          handledBy: data.handledBy,
          remarks: data.remarks || null
        }
      })

      return { item, isNew, unitPrice: calculatedUnitPrice }
    })

    revalidatePath("/forms/maintenance/dashboard")

    // Log the user activity
    if (result.isNew) {
      await logUserAction(
        "Registered Maintenance Item",
        `Created new item: ${result.item.name} (${result.item.location}) with initial quantity of ${data.quantity} ${result.item.unit} at RM ${data.totalPrice.toFixed(2)} (Unit Price: RM ${result.unitPrice.toFixed(2)}/${result.item.unit}). Handled by: ${data.handledBy}. Remarks: ${data.remarks || "-"}`
      )
    } else {
      await logUserAction(
        "Added Maintenance Stock",
        `Added ${data.quantity} ${result.item.unit} to item: ${result.item.name} (${result.item.location}) at RM ${data.totalPrice.toFixed(2)} (Unit Price: RM ${result.unitPrice.toFixed(2)}/${result.item.unit}). Handled by: ${data.handledBy}. Remarks: ${data.remarks || "-"}`
      )
    }

    return { success: true, data: result.item }
  } catch (error: any) {
    console.error("Failed to add maintenance stock:", error)
    return { success: false, error: error.message }
  }
}

export async function withdrawMaintenanceStock(data: {
  itemId: string
  quantity: number
  handledBy: string
  remarks?: string
}) {
  try {
    if (data.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero." }
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.maintenanceItem.findUnique({
        where: { id: data.itemId }
      })

      if (!item) {
        throw new Error("Item not found.")
      }

      if (item.quantity < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${item.quantity} ${item.unit}, requested: ${data.quantity} ${item.unit}.`)
      }

      // Decrement existing item
      const updatedItem = await tx.maintenanceItem.update({
        where: { id: data.itemId },
        data: {
          quantity: { decrement: data.quantity }
        }
      })

      // Create Stock Log
      const withdrawalTotal = Number((item.pricePerUnit * data.quantity).toFixed(2))
      await tx.maintenanceStockLog.create({
        data: {
          itemId: item.id,
          type: "OUT",
          quantity: data.quantity,
          pricePerUnit: item.pricePerUnit,
          totalPrice: withdrawalTotal,
          handledBy: data.handledBy,
          remarks: data.remarks || null
        }
      })

      return updatedItem
    })

    revalidatePath("/forms/maintenance/dashboard")

    // Log the user activity
    await logUserAction(
      "Withdrew Maintenance Stock",
      `Withdrew ${data.quantity} ${result.unit} from item: ${result.name} (${result.location}). Handled by: ${data.handledBy}. Remarks: ${data.remarks || "-"}`
    )

    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to withdraw maintenance stock:", error)
    return { success: false, error: error.message }
  }
}

export async function getMaintenanceStockReport(filters: {
  startDate?: string
  endDate?: string
}) {
  try {
    const where: any = {}

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        // Set to end of the day
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const logs = await prisma.maintenanceStockLog.findMany({
      where,
      include: {
        item: true
      },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, data: logs }
  } catch (error: any) {
    console.error("Failed to fetch maintenance stock report:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteMaintenanceItem(itemId: string) {
  try {
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return { success: false, error: "Item not found." }
    }

    await prisma.maintenanceItem.delete({
      where: { id: itemId }
    })

    revalidatePath("/forms/maintenance/dashboard")

    // Log the user activity
    await logUserAction(
      "Deleted Maintenance Item",
      `Deleted item: ${item.name} (${item.location}).`
    )

    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete maintenance item:", error)
    return { success: false, error: error.message }
  }
}

export async function getMaintenanceItemHistory(itemId: string) {
  try {
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: itemId },
      include: {
        logs: {
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!item) {
      return { success: false, error: "Item not found." }
    }

    return { success: true, data: item }
  } catch (error: any) {
    console.error("Failed to fetch maintenance item history:", error)
    return { success: false, error: error.message }
  }
}

export async function updateMaintenanceItemImage(itemId: string, formData: FormData) {
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

    const updated = await prisma.maintenanceItem.update({
      where: { id: itemId },
      data: { imageUrl: url }
    })

    revalidatePath("/forms/maintenance/dashboard")

    await logUserAction(
      "Updated Maintenance Item Image",
      `Updated image for item: ${updated.name} (${updated.location}).`
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to update item image:", error)
    return { success: false, error: error.message }
  }
}

export async function uploadMaintenanceItemPhotoAction(formData: FormData) {
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
    console.error("Failed to upload item photo:", error)
    return { success: false, error: error.message }
  }
}

