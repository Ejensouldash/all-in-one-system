"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAccessInfo } from "@/lib/access"
import { logUserAction } from "@/app/actions/audit"
import { revalidatePath } from "next/cache"
import type { ProductRecallFormInput } from "./types"

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Creates a new Product Recall entry with its line items.
 */
export async function createProductRecall(input: ProductRecallFormInput) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized access. Please sign in." }
    }

    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Access verification failed." }
    }

    if (!input.recallDate) {
      return { success: false, error: "Recall Date is required." }
    }

    const validItems = (input.items || []).filter(
      item => item.customer?.trim() || item.sku?.trim() || item.batchNumber?.trim() || Number(item.quantity) > 0
    )

    if (validItems.length === 0) {
      return { success: false, error: "At least one item row is required with valid data." }
    }

    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i]
      if (!it.customer?.trim()) {
        return { success: false, error: `Row ${i + 1}: Customer name is required.` }
      }
      if (!it.sku?.trim()) {
        return { success: false, error: `Row ${i + 1}: SKU is required.` }
      }
      if (!it.batchNumber?.trim()) {
        return { success: false, error: `Row ${i + 1}: Batch Number is required.` }
      }
      const qty = Number(it.quantity)
      if (isNaN(qty) || qty <= 0) {
        return { success: false, error: `Row ${i + 1}: Quantity must be greater than 0.` }
      }
    }

    // Generate reference number PR-YYYYMM-XXX
    const parsedDate = new Date(input.recallDate)
    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0")
    const datePrefix = `PR-${year}${month}`

    const countThisMonth = await prisma.productRecall.count({
      where: {
        recallNo: {
          startsWith: datePrefix,
        },
      },
    })
    const recallNo = `${datePrefix}-${String(countThisMonth + 1).padStart(3, "0")}`

    const preparedByName = access.name || session.user.name || "QC Operator"

    const record = await prisma.productRecall.create({
      data: {
        recallNo,
        recallDate: parsedDate,
        reason: input.reason?.trim() || null,
        remarks: input.remarks?.trim() || null,
        preparedById: session.user.id,
        preparedByName,
        items: {
          create: validItems.map(item => ({
            customer: item.customer.trim(),
            sku: item.sku.trim(),
            batchNumber: item.batchNumber.trim(),
            quantity: Math.floor(Number(item.quantity)),
            remarks: item.remarks?.trim() || null,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    await logUserAction(
      `Created Product Recall ${recallNo}`,
      JSON.stringify({
        recallId: record.id,
        recallNo,
        itemCount: record.items.length,
        totalQuantity: record.items.reduce((acc, i) => acc + i.quantity, 0),
      })
    )

    revalidatePath("/forms/maintenance")
    revalidatePath("/forms/maintenance/reports/product-recall")

    return {
      success: true,
      data: {
        id: record.id,
        recallNo: record.recallNo,
      },
      message: `Product Recall record ${recallNo} created successfully with ${record.items.length} items.`,
    }
  } catch (error: unknown) {
    console.error("Failed to create product recall:", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save Product Recall record."),
    }
  }
}

/**
 * Deletes a product recall record and its associated items.
 */
export async function deleteProductRecall(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized access. Please sign in." }
    }

    const access = await getAccessInfo()
    const canDelete =
      access?.isSuperAdmin ||
      access?.modules?.includes("GMP_FORMS") ||
      access?.modules?.includes("MAINTENANCE_FORMS") ||
      access?.modules?.includes("GMP_REPORTS") ||
      access?.modules?.includes("MAINTENANCE_REPORTS")

    if (!canDelete) {
      return { success: false, error: "You do not have permission to delete this record." }
    }

    const existing = await prisma.productRecall.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return { success: false, error: "Record not found." }
    }

    await prisma.productRecall.delete({
      where: { id },
    })

    await logUserAction(
      `Deleted Product Recall ${existing.recallNo || existing.id}`,
      JSON.stringify({ id, recallNo: existing.recallNo })
    )

    revalidatePath("/forms/maintenance/reports/product-recall")
    return { success: true, message: "Record deleted successfully." }
  } catch (error: unknown) {
    console.error("Failed to delete product recall:", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete record."),
    }
  }
}
