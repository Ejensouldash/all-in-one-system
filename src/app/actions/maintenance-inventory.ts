"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logUserAction } from "./audit"

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
  unit: string
  handledBy: string
  remarks?: string
  location?: string
}) {
  try {
    if (data.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero." }
    }

    const result = await prisma.$transaction(async (tx) => {
      let item;
      let isNew = false;

      if (data.itemId) {
        // Increment existing item
        item = await tx.maintenanceItem.update({
          where: { id: data.itemId },
          data: {
            quantity: { increment: data.quantity }
          }
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
            quantity: data.quantity,
            unit: data.unit || "pcs"
          }
        })
        isNew = true;
      }

      // Create Stock Log
      await tx.maintenanceStockLog.create({
        data: {
          itemId: item.id,
          type: "IN",
          quantity: data.quantity,
          handledBy: data.handledBy,
          remarks: data.remarks || null
        }
      })

      return { item, isNew }
    })

    revalidatePath("/forms/maintenance/dashboard")

    // Log the user activity
    if (result.isNew) {
      await logUserAction(
        "Registered Maintenance Item",
        `Created new item: ${result.item.name} (${result.item.location}) with initial quantity of ${data.quantity} ${result.item.unit}. Handled by: ${data.handledBy}. Remarks: ${data.remarks || "-"}`
      )
    } else {
      await logUserAction(
        "Added Maintenance Stock",
        `Added ${data.quantity} ${result.item.unit} to item: ${result.item.name} (${result.item.location}). Handled by: ${data.handledBy}. Remarks: ${data.remarks || "-"}`
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
      await tx.maintenanceStockLog.create({
        data: {
          itemId: item.id,
          type: "OUT",
          quantity: data.quantity,
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
