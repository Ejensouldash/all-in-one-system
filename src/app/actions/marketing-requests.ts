"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, canAccessMarketingAssets, canAccessMarketingInventory } from "@/lib/access"
import { logUserAction } from "./audit"
import {
  lockMarketingRequisitionNumbers,
  loanNumberSequence,
  merchandiseRequestNumberSequence,
  nextRequisitionBatchCode,
} from "@/lib/marketing/requisition-numbers"

export interface MarketingAvailableItem {
  id: string
  name: string
  category: string
  type: "ASSET" | "INVENTORY"
  availableQuantity: number
  totalQuantity?: number
  unit: string
  imageUrl?: string | null
  brand?: string | null
  location: string
  condition?: string
  hasVariants?: boolean
  variants?: Array<{
    id: string
    variantName: string
    quantity: number
  }>
}

// Public or Internal fetch of all visible assets and inventory items
export async function getAvailableMarketingItemsAndAssets() {
  try {
    // 1. Fetch reusable Marketing Assets
    const assets = await prisma.marketingAsset.findMany({
      where: {
        condition: { not: "Damaged" },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        assetCode: true,
        name: true,
        category: true,
        brand: true,
        location: true,
        availableQuantity: true,
        totalQuantity: true,
        unit: true,
        imageUrl: true,
        condition: true,
      },
    })

    // 2. Fetch Marketing Inventory (Merchandise / Collaterals / POSM)
    const inventoryItems = await prisma.marketingItem.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        location: true,
        quantity: true,
        unit: true,
        imageUrl: true,
        hasVariants: true,
        variants: {
          select: {
            id: true,
            variantName: true,
            quantity: true,
          },
          orderBy: { variantName: "asc" },
        },
      },
    })

    const combinedList: MarketingAvailableItem[] = [
      ...assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category || "FURNITURE",
        type: "ASSET" as const,
        availableQuantity: a.availableQuantity,
        totalQuantity: a.totalQuantity,
        unit: a.unit || "units",
        imageUrl: a.imageUrl,
        brand: a.brand,
        location: a.location || "HQ Store",
        condition: a.condition,
      })),
      ...inventoryItems.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category || "MERCHANDISE",
        type: "INVENTORY" as const,
        availableQuantity: i.quantity,
        totalQuantity: i.quantity,
        unit: i.unit || "pcs",
        imageUrl: i.imageUrl,
        brand: i.brand,
        location: i.location || "HQ Store",
        hasVariants: i.hasVariants,
        variants: i.variants,
      })),
    ]

    return { success: true, data: combinedList }
  } catch (error: any) {
    console.error("Failed to fetch available marketing items:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export interface RequisitionItemInput {
  itemId: string
  itemType: "ASSET" | "INVENTORY"
  quantity: number
  variantId?: string | null
  variantName?: string | null
  returnDate?: string | null
}

export interface SubmitRequisitionPayload {
  name: string
  staffId: string
  phone: string
  email: string
  department: string
  purpose: string
  pickupDate: string // YYYY-MM-DD
  items: RequisitionItemInput[]
}

// Generate unique sequential requisition batch code (REQ-MKT-YYYY-XXXX)
async function generateRequisitionBatchCode(client: any = prisma): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `REQ-MKT-${currentYear}-`

  const [loans, requests] = await Promise.all([
    client.marketingAssetLoan.findMany({
      where: { remarks: { contains: prefix } },
      select: { remarks: true },
    }),
    client.marketingMerchandiseRequest.findMany({
      where: { remarks: { contains: prefix } },
      select: { remarks: true },
    }),
  ])

  let maxNum = 0
  const parseNum = (str: string | null | undefined) => {
    if (!str) return
    const match = str.match(/REQ-MKT-\d{4}-(\d+)/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (!isNaN(n) && n > maxNum) maxNum = n
    }
  }

  loans.forEach((l: any) => parseNum(l.remarks))
  requests.forEach((r: any) => parseNum(r.remarks))

  const nextNum = maxNum + 1
  return `${prefix}${nextNum.toString().padStart(4, "0")}`
}

// Get next sequential integer for Loan Number: LN-MKT-YYYY-XXXX
async function getNextLoanSequence(client: any = prisma): Promise<number> {
  const currentYear = new Date().getFullYear()
  const prefix = `LN-MKT-${currentYear}-`

  const loans = await client.marketingAssetLoan.findMany({
    where: { loanNumber: { startsWith: prefix } },
    select: { loanNumber: true },
  })

  let maxNum = 0
  for (const l of loans) {
    if (l.loanNumber) {
      const parts = l.loanNumber.split("-")
      const seq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(seq) && seq > maxNum) maxNum = seq
    }
  }

  return maxNum + 1
}

// Generate Loan Number: LN-MKT-YYYY-XXXX
async function generateLoanNumber(client: any = prisma): Promise<string> {
  const currentYear = new Date().getFullYear()
  const nextNum = await getNextLoanSequence(client)
  return `LN-MKT-${currentYear}-${nextNum.toString().padStart(4, "0")}`
}

// Get next sequential integer for Merchandise Request Number: MR-MKT-YYYY-XXXX
async function getNextMerchandiseReqSequence(client: any = prisma): Promise<number> {
  const currentYear = new Date().getFullYear()
  const prefix = `MR-MKT-${currentYear}-`

  const reqs = await client.marketingMerchandiseRequest.findMany({
    where: { requestNumber: { startsWith: prefix } },
    select: { requestNumber: true },
  })

  let maxNum = 0
  for (const r of reqs) {
    if (r.requestNumber) {
      const parts = r.requestNumber.split("-")
      const seq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(seq) && seq > maxNum) maxNum = seq
    }
  }

  return maxNum + 1
}

// Generate Merchandise Request Number: MR-MKT-YYYY-XXXX
async function generateMerchandiseReqNumber(client: any = prisma): Promise<string> {
  const currentYear = new Date().getFullYear()
  const nextNum = await getNextMerchandiseReqSequence(client)
  return `MR-MKT-${currentYear}-${nextNum.toString().padStart(4, "0")}`
}

// Submit Requisition from QR Form
export async function submitMarketingRequisition(payload: SubmitRequisitionPayload) {
  try {
    const { name, staffId, phone, email, department, purpose, pickupDate, items } = payload

    if (!name?.trim()) return { success: false, error: "Name is required." }
    if (!staffId?.trim()) return { success: false, error: "Staff ID is required." }
    if (!phone?.trim()) return { success: false, error: "Phone number is required." }
    if (!email?.trim()) return { success: false, error: "Email address is required." }
    if (!department?.trim()) return { success: false, error: "Department is required." }
    if (!purpose?.trim()) return { success: false, error: "Purpose is required." }
    if (!pickupDate) return { success: false, error: "Pickup date is required." }
    if (!items || items.length === 0) return { success: false, error: "Please select at least one item." }

    const pickupDateTime = new Date(pickupDate)
    if (isNaN(pickupDateTime.getTime())) {
      return { success: false, error: "Invalid pickup date provided." }
    }

    // Validate quantities and item existence
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        return { success: false, error: `Invalid quantity for selected item.` }
      }

      if (item.itemType === "ASSET") {
        if (item.returnDate) {
          const returnDateTime = new Date(item.returnDate)
          if (isNaN(returnDateTime.getTime())) {
            return { success: false, error: "Invalid return date specified for asset." }
          }
        }
        const asset = await prisma.marketingAsset.findUnique({ where: { id: item.itemId } })
        if (!asset) return { success: false, error: "Requested asset could not be found." }
        if (asset.availableQuantity < item.quantity) {
          return {
            success: false,
            error: `Not enough units available for "${asset.name}". Available: ${asset.availableQuantity} ${asset.unit}.`,
          }
        }
      } else {
        const inventoryItem = await prisma.marketingItem.findUnique({
          where: { id: item.itemId },
          include: { variants: true },
        })
        if (!inventoryItem) return { success: false, error: "Requested inventory item could not be found." }

        if (item.variantId) {
          const variant = inventoryItem.variants.find((v) => v.id === item.variantId)
          if (!variant) return { success: false, error: "Requested item variant could not be found." }
          if (variant.quantity < item.quantity) {
            return {
              success: false,
              error: `Not enough stock available for "${inventoryItem.name} (${variant.variantName})". Available: ${variant.quantity} ${inventoryItem.unit}.`,
            }
          }
        } else {
          if (inventoryItem.quantity < item.quantity) {
            return {
              success: false,
              error: `Not enough stock available for "${inventoryItem.name}". Available: ${inventoryItem.quantity} ${inventoryItem.unit}.`,
            }
          }
        }
      }
    }

    // Process all items in database transaction
    await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear()
      let nextLoanSeq = await getNextLoanSequence(tx)
      let nextMerchSeq = await getNextMerchandiseReqSequence(tx)

      for (const item of items) {
        if (item.itemType === "ASSET") {
          const loanNo = `LN-MKT-${currentYear}-${(nextLoanSeq++).toString().padStart(4, "0")}`
    const batchCode = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      await lockMarketingRequisitionNumbers(tx, year)
      const batchCode = await nextRequisitionBatchCode(tx, year)
      const nextLoanNumber = await loanNumberSequence(tx, year)
      const nextRequestNumber = await merchandiseRequestNumberSequence(tx, year)

      for (const item of items) {
        if (item.itemType === "ASSET") {
          const loanNo = nextLoanNumber()
          const returnDate = item.returnDate
            ? new Date(item.returnDate)
            : new Date(pickupDateTime.getTime() + 3 * 24 * 60 * 60 * 1000)

          await tx.marketingAssetLoan.create({
            data: {
              loanNumber: loanNo,
              assetId: item.itemId,
              quantity: item.quantity,
              borrowerName: name.trim(),
              borrowerStaffId: staffId.trim(),
              borrowerContact: phone.trim(),
              borrowerEmail: email.trim().toLowerCase(),
              borrowerDepartment: department.trim(),
              destination: `${department.trim()} / ${purpose.trim().substring(0, 50)}`,
              purpose: purpose.trim(),
              borrowDateTime: pickupDateTime,
              expectedReturn: returnDate,
              status: "PENDING",
              remarks: `Requisition Batch: ${batchCode} | Staff ID: ${staffId.trim()} | Email: ${email.trim()}`,
            },
          })
        } else {
          const reqNo = `MR-MKT-${currentYear}-${(nextMerchSeq++).toString().padStart(4, "0")}`
          const reqNo = nextRequestNumber()

          await tx.marketingMerchandiseRequest.create({
            data: {
              requestNumber: reqNo,
              itemId: item.itemId,
              variantId: item.variantId || null,
              variantName: item.variantName || null,
              quantity: item.quantity,
              requesterName: name.trim(),
              requesterStaffId: staffId.trim(),
              requesterPhone: phone.trim(),
              requesterEmail: email.trim().toLowerCase(),
              requesterDepartment: department.trim(),
              purpose: purpose.trim(),
              pickupDate: pickupDateTime,
              status: "PENDING",
              remarks: `Requisition Batch: ${batchCode}`,
            },
          })
        }
      }

      return batchCode
    })

    revalidatePath("/marketing/assets")
    revalidatePath("/marketing/inventory")
    revalidatePath("/marketing/forms")

    return {
      success: true,
      batchCode,
      itemCount: items.length,
      requesterName: name.trim(),
      pickupDate: pickupDate,
    }
  } catch (error: any) {
    console.error("Failed to submit marketing requisition:", error)
    return { success: false, error: error.message || "Failed to submit requisition." }
  }
}

// Fetch all merchandise requests for marketing inventory management
export async function getMarketingMerchandiseRequests() {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingInventory(access)) {
      return { success: false, error: "Unauthorized access." }
    }

    const requests = await prisma.marketingMerchandiseRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        item: true,
        variant: true,
      },
    })

    return { success: true, data: requests }
  } catch (error: any) {
    console.error("Failed to fetch merchandise requests:", error)
    return { success: false, error: error.message }
  }
}

// Approve and dispense merchandise request (deducts stock and records OUT log)
export async function approveMarketingMerchandiseRequest(requestId: string, handledBy: string) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingInventory(access)) {
      return { success: false, error: "Unauthorized access." }
    }

    const result = await prisma.$transaction(async (tx) => {
      const req = await tx.marketingMerchandiseRequest.findUnique({
        where: { id: requestId },
        include: { item: true, variant: true },
      })

      if (!req) throw new Error("Request not found.")
      if (req.status !== "PENDING") {
        throw new Error(`Request is already ${req.status}.`)
      }

      let unitPrice = req.item.pricePerUnit || 0
      let costPerUnit = Number(req.item.costPerUnit || 0)
      let sellingPricePerUnit = Number(req.item.sellingPricePerUnit || unitPrice)

      // If this request is for a specific variant
      if (req.variantId) {
        const variant = await tx.marketingItemVariant.findUnique({
          where: { id: req.variantId },
        })

        if (!variant) throw new Error("Requested variant not found.")
        if (variant.quantity < req.quantity) {
          throw new Error(
            `Insufficient stock for "${variant.variantName}". Available: ${variant.quantity}, Requested: ${req.quantity}`
          )
        }

        if (variant.pricePerUnit && variant.pricePerUnit > 0) {
          unitPrice = variant.pricePerUnit
        }
        if (variant.costPerUnit != null) {
          costPerUnit = Number(variant.costPerUnit)
        }
        if (variant.sellingPricePerUnit != null) {
          sellingPricePerUnit = Number(variant.sellingPricePerUnit)
        }

        // Decrement variant quantity
        await tx.marketingItemVariant.update({
          where: { id: req.variantId },
          data: {
            quantity: { decrement: req.quantity },
          },
        })
      } else {
        if (req.item.quantity < req.quantity) {
          throw new Error(
            `Insufficient stock in HQ Store for "${req.item.name}". Available: ${req.item.quantity}, Requested: ${req.quantity}`
          )
        }
      }

      // Decrement item quantity
      await tx.marketingItem.update({
        where: { id: req.itemId },
        data: {
          quantity: { decrement: req.quantity },
        },
      })

      // Create Stock Log OUT
      const totalCostVal = Number((costPerUnit * req.quantity).toFixed(2))
      const totalPriceVal = Number(((sellingPricePerUnit || unitPrice) * req.quantity).toFixed(2))
      await tx.marketingStockLog.create({
        data: {
          itemId: req.itemId,
          variantId: req.variantId || null,
          variantName: req.variant?.variantName || req.variantName || null,
          type: "OUT",
          quantity: req.quantity,
          totalPrice: totalPriceVal,
          pricePerUnit: sellingPricePerUnit || unitPrice,
          totalCost: totalCostVal,
          costPerUnit: costPerUnit,
          sellingPricePerUnit: sellingPricePerUnit,
          department: req.requesterDepartment || "MARKETING",
          handledBy: handledBy || "Marketing PIC",
          remarks: `Requisition ${req.requestNumber} dispensed to ${req.requesterName} (${req.requesterDepartment}).${req.variantName ? ` [${req.variantName}]` : ""} Purpose: ${req.purpose}`,
        },
      })

      // Update request status
      const updatedReq = await tx.marketingMerchandiseRequest.update({
        where: { id: requestId },
        data: {
          status: "DISPATCHED",
          approvedBy: handledBy,
          approvedAt: new Date(),
          dispatchedBy: handledBy,
          dispatchedAt: new Date(),
        },
      })

      return updatedReq
    })

    revalidatePath("/marketing/inventory")
    revalidatePath("/business-development/marketing/inventory")

    await logUserAction(
      "Approved Marketing Merchandise Requisition",
      `Dispensed ${result.quantity} units for Requisition ${result.requestNumber} to ${result.requesterName} (${result.requesterDepartment}).`
    )

    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to approve merchandise request:", error)
    return { success: false, error: error.message }
  }
}

// Reject merchandise request
export async function rejectMarketingMerchandiseRequest(requestId: string, reason: string, handledBy: string) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingInventory(access)) {
      return { success: false, error: "Unauthorized access." }
    }

    const updated = await prisma.marketingMerchandiseRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectionReason: reason || "Rejected by Marketing",
        approvedBy: handledBy,
        approvedAt: new Date(),
      },
    })

    revalidatePath("/marketing/inventory")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to reject merchandise request:", error)
    return { success: false, error: error.message }
  }
}
