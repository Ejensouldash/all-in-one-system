"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getAccessInfo, canAccessMarketingAssets } from "@/lib/access"
import { logUserAction } from "./audit"
import { uploadMaintenanceItemPhoto } from "@/lib/maintenance-r2"

// Seed default items if empty so user immediately has items to test
async function seedDefaultMarketingAssetsIfEmpty() {
  const count = await prisma.marketingAsset.count()
  if (count === 0) {
    const defaults = [
      {
        assetCode: "MKT-AST-0001",
        name: "LED Display Board 65\"",
        category: "DISPLAY_TECH",
        brand: "Samsung / Outdoor Pro",
        location: "HQ Store",
        totalQuantity: 2,
        availableQuantity: 2,
        unit: "units",
        condition: "Good",
        notes: "High brightness outdoor/indoor mobile LED board with rolling flight case.",
      },
      {
        assetCode: "MKT-AST-0002",
        name: "Heavy Duty Folding Banquet Table (6ft)",
        category: "FURNITURE",
        brand: "Lifetime",
        location: "HQ Store",
        totalQuantity: 10,
        availableQuantity: 10,
        unit: "units",
        condition: "Good",
        notes: "Foldable banquet tables with Bubbles O2 table cloth.",
      },
      {
        assetCode: "MKT-AST-0003",
        name: "Executive VIP Event Sofa (3-Seater)",
        category: "FURNITURE",
        brand: "Custom Event Décor",
        location: "HQ Store",
        totalQuantity: 2,
        availableQuantity: 2,
        unit: "units",
        condition: "Good",
        notes: "Navy blue velvet VIP sofa used for exhibitions and stage guest seating.",
      },
      {
        assetCode: "MKT-AST-0004",
        name: "Banquet Chairs with Black Covers",
        category: "FURNITURE",
        brand: "Standard Event",
        location: "HQ Store",
        totalQuantity: 40,
        availableQuantity: 40,
        unit: "units",
        condition: "Good",
        notes: "Stackable padded banquet chairs.",
      },
      {
        assetCode: "MKT-AST-0005",
        name: "Pop-up Promotional Booth Counter",
        category: "BOOTH_FIXTURE",
        brand: "Bubbles O2 Branded",
        location: "HQ Store",
        totalQuantity: 4,
        availableQuantity: 4,
        unit: "units",
        condition: "Good",
        notes: "Curved fabric magnetic exhibition counter with carry bag.",
      },
    ]

    for (const d of defaults) {
      await prisma.marketingAsset.create({ data: d })
    }
  }
}

export async function getMarketingAssets() {
  try {
    await seedDefaultMarketingAssetsIfEmpty()

    const assets = await prisma.marketingAsset.findMany({
      orderBy: { name: "asc" },
      include: {
        loans: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })
    return { success: true, data: assets }
  } catch (error: any) {
    console.error("Failed to fetch marketing assets:", error)
    return { success: false, error: error.message }
  }
}

export async function getMarketingAssetLoans(filterStatus?: string) {
  try {
    const where: any = {}
    if (filterStatus && filterStatus !== "ALL") {
      where.status = filterStatus
    }

    const loans = await prisma.marketingAssetLoan.findMany({
      where,
      include: {
        asset: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: loans }
  } catch (error: any) {
    console.error("Failed to fetch marketing asset loans:", error)
    return { success: false, error: error.message }
  }
}

export async function addMarketingAsset(data: {
  assetCode?: string
  name: string
  category: string
  brand?: string | null
  location?: string
  quantity: number
  unit?: string
  condition?: string
  notes?: string | null
  imageUrl?: string | null
}) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const nameUpper = data.name.trim()
    if (!nameUpper) return { success: false, error: "Asset name is required." }

    const qty = Number(data.quantity) || 1
    if (qty <= 0) return { success: false, error: "Quantity must be at least 1." }

    const locationVal = data.location?.trim() || "HQ Store"

    // Generate asset code if not provided
    let code = data.assetCode?.trim().toUpperCase()
    if (!code) {
      const count = await prisma.marketingAsset.count()
      code = `MKT-AST-${String(count + 1).padStart(4, "0")}`
    }

    const existingCode = await prisma.marketingAsset.findUnique({
      where: { assetCode: code },
    })
    if (existingCode) {
      return { success: false, error: `Asset code ${code} is already in use. Please enter a unique code.` }
    }

    const existingName = await prisma.marketingAsset.findUnique({
      where: {
        name_location: {
          name: nameUpper,
          location: locationVal,
        },
      },
    })
    if (existingName) {
      return { success: false, error: `Asset "${nameUpper}" already exists in location "${locationVal}".` }
    }

    const asset = await prisma.marketingAsset.create({
      data: {
        assetCode: code,
        name: nameUpper,
        category: data.category || "FURNITURE",
        brand: data.brand?.trim() || null,
        location: locationVal,
        totalQuantity: qty,
        availableQuantity: qty,
        unit: data.unit || "units",
        condition: data.condition || "Good",
        notes: data.notes?.trim() || null,
        imageUrl: data.imageUrl || null,
        department: "MARKETING",
      },
    })

    revalidatePath("/marketing/assets")
    revalidatePath("/marketing/forms")

    await logUserAction(
      "Registered Marketing Asset",
      `Registered new marketing asset: ${asset.name} (${asset.assetCode}) with quantity of ${qty} ${asset.unit}. Added by: ${session?.user?.name || "User"}.`
    )

    return { success: true, data: asset }
  } catch (error: any) {
    console.error("Failed to add marketing asset:", error)
    return { success: false, error: error.message }
  }
}

export async function editMarketingAsset(
  id: string,
  data: {
    assetCode?: string
    name: string
    category: string
    brand?: string | null
    location?: string
    totalQuantity: number
    unit?: string
    condition?: string
    notes?: string | null
    imageUrl?: string | null
  }
) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const existing = await prisma.marketingAsset.findUnique({
      where: { id },
      include: { loans: { where: { status: { in: ["APPROVED", "LENT_OUT"] } } } },
    })

    if (!existing) return { success: false, error: "Asset not found." }

    const newTotal = Number(data.totalQuantity) || 1
    // Calculate currently lent out quantity
    const activeLentQty = existing.loans.reduce((acc, l) => acc + l.quantity, 0)

    if (newTotal < activeLentQty) {
      return {
        success: false,
        error: `Cannot reduce total quantity below ${activeLentQty} because ${activeLentQty} units are currently lent out.`,
      }
    }

    const newAvailable = Math.max(0, newTotal - activeLentQty)

    const updated = await prisma.marketingAsset.update({
      where: { id },
      data: {
        name: data.name.trim(),
        category: data.category,
        brand: data.brand?.trim() || null,
        location: data.location?.trim() || "HQ Store",
        totalQuantity: newTotal,
        availableQuantity: newAvailable,
        unit: data.unit || "units",
        condition: data.condition || "Good",
        notes: data.notes?.trim() || null,
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      },
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Updated Marketing Asset",
      `Updated marketing asset ${updated.name} (${updated.assetCode}). Handled by: ${session?.user?.name || "User"}.`
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to edit marketing asset:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteMarketingAsset(id: string) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const asset = await prisma.marketingAsset.findUnique({
      where: { id },
      include: {
        loans: {
          where: { status: { in: ["APPROVED", "LENT_OUT"] } },
        },
      },
    })

    if (!asset) return { success: false, error: "Asset not found." }

    if (asset.loans.length > 0) {
      return {
        success: false,
        error: `Cannot delete asset "${asset.name}" because it currently has active/approved loans. Please return or cancel them first.`,
      }
    }

    await prisma.marketingAsset.delete({
      where: { id },
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Deleted Marketing Asset",
      `Deleted marketing asset: ${asset.name} (${asset.assetCode}). Handled by: ${session?.user?.name || "User"}.`
    )

    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete marketing asset:", error)
    return { success: false, error: error.message }
  }
}

export async function requestMarketingAssetLoan(data: {
  assetId: string
  quantity: number
  borrowerName: string
  borrowerDepartment?: string
  borrowerContact?: string
  destination: string
  purpose?: string
  borrowDateTime: string
  expectedReturn: string
  remarks?: string
}) {
  try {
    const access = await getAccessInfo()
    if (!access || (!access.isSuperAdmin && !access.modules.includes("MARKETING_ASSETS") && !access.modules.includes("MARKETING_FORMS"))) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS or MARKETING_FORMS access." }
    }

    const session = await auth()
    const asset = await prisma.marketingAsset.findUnique({
      where: { id: data.assetId },
    })

    if (!asset) return { success: false, error: "Asset not found." }

    const requestedQty = Number(data.quantity) || 1
    if (requestedQty <= 0) return { success: false, error: "Requested quantity must be at least 1." }
    if (requestedQty > asset.availableQuantity) {
      return {
        success: false,
        error: `Only ${asset.availableQuantity} ${asset.unit} available. Cannot borrow ${requestedQty} ${asset.unit}.`,
      }
    }

    const destinationVal = data.destination.trim()
    if (!destinationVal) return { success: false, error: "Destination (where the asset is being brought to) is required." }

    const borrowerNameVal = data.borrowerName.trim()
    if (!borrowerNameVal) return { success: false, error: "Borrower name is required." }

    // Generate loan number
    const year = new Date().getFullYear()
    const count = await prisma.marketingAssetLoan.count()
    const loanNumber = `LN-MKT-${year}-${String(count + 1).padStart(4, "0")}`

    const loan = await prisma.marketingAssetLoan.create({
      data: {
        loanNumber,
        assetId: data.assetId,
        quantity: requestedQty,
        borrowerName: borrowerNameVal,
        borrowerDepartment: data.borrowerDepartment?.trim() || null,
        borrowerContact: data.borrowerContact?.trim() || null,
        destination: destinationVal,
        purpose: data.purpose?.trim() || null,
        borrowDateTime: new Date(data.borrowDateTime),
        expectedReturn: new Date(data.expectedReturn),
        status: "PENDING",
        remarks: data.remarks?.trim() || null,
      },
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Requested Marketing Asset Loan",
      `Submitted lending request ${loan.loanNumber} for ${requestedQty} ${asset.unit} of "${asset.name}" to "${destinationVal}". Borrower: ${borrowerNameVal}.`
    )

    return { success: true, data: loan }
  } catch (error: any) {
    console.error("Failed to request marketing asset loan:", error)
    return { success: false, error: error.message }
  }
}

export async function approveMarketingAssetLoan(loanId: string, dispatchNow = false) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const approver = session?.user?.name || "Marketing Team"

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.marketingAssetLoan.findUnique({
        where: { id: loanId },
        include: { asset: true },
      })

      if (!loan) throw new Error("Lending request not found.")
      if (loan.status !== "PENDING") {
        throw new Error(`Cannot approve request with status "${loan.status}".`)
      }

      if (loan.asset.availableQuantity < loan.quantity) {
        throw new Error(
          `Cannot approve: Only ${loan.asset.availableQuantity} ${loan.asset.unit} currently available, but requested ${loan.quantity}.`
        )
      }

      // If approved, decrement asset available quantity
      await tx.marketingAsset.update({
        where: { id: loan.assetId },
        data: {
          availableQuantity: { decrement: loan.quantity },
        },
      })

      const newStatus = dispatchNow ? "LENT_OUT" : "APPROVED"

      const updatedLoan = await tx.marketingAssetLoan.update({
        where: { id: loanId },
        data: {
          status: newStatus,
          approvedBy: approver,
          approvedAt: new Date(),
        },
      })

      return { updatedLoan, asset: loan.asset }
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Approved Marketing Asset Loan",
      `Approved lending request ${result.updatedLoan.loanNumber} for ${result.asset.name}. Approved by: ${approver}.`
    )

    return { success: true, data: result.updatedLoan }
  } catch (error: any) {
    console.error("Failed to approve loan:", error)
    return { success: false, error: error.message }
  }
}

export async function dispatchMarketingAssetLoan(loanId: string) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const loan = await prisma.marketingAssetLoan.findUnique({
      where: { id: loanId },
      include: { asset: true },
    })

    if (!loan) return { success: false, error: "Loan not found." }
    if (loan.status !== "APPROVED") {
      return { success: false, error: `Can only dispatch loans that are APPROVED (current: ${loan.status}).` }
    }

    const updated = await prisma.marketingAssetLoan.update({
      where: { id: loanId },
      data: {
        status: "LENT_OUT",
      },
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Dispatched Marketing Asset",
      `Marked asset as lent out for loan ${loan.loanNumber}: ${loan.asset.name} to ${loan.destination}. Dispatched by: ${session?.user?.name || "Marketing"}.`
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to dispatch loan:", error)
    return { success: false, error: error.message }
  }
}

export async function rejectMarketingAssetLoan(loanId: string, reason: string) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const approver = session?.user?.name || "Marketing Team"

    const loan = await prisma.marketingAssetLoan.findUnique({
      where: { id: loanId },
      include: { asset: true },
    })

    if (!loan) return { success: false, error: "Lending request not found." }
    if (loan.status !== "PENDING") {
      return { success: false, error: `Cannot reject request with status "${loan.status}".` }
    }

    const updated = await prisma.marketingAssetLoan.update({
      where: { id: loanId },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim() || "Request rejected by marketing team.",
        approvedBy: approver,
        approvedAt: new Date(),
      },
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Rejected Marketing Asset Loan",
      `Rejected lending request ${loan.loanNumber} for ${loan.asset.name}. Reason: ${reason}. Rejected by: ${approver}.`
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to reject loan:", error)
    return { success: false, error: error.message }
  }
}

export async function returnMarketingAssetLoan(
  loanId: string,
  data: {
    returnedBy?: string
    conditionOnReturn?: string
    returnedNotes?: string
  }
) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingAssets(access)) {
      return { success: false, error: "Unauthorized: Missing MARKETING_ASSETS module access." }
    }

    const session = await auth()
    const handler = session?.user?.name || "Marketing Staff"

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.marketingAssetLoan.findUnique({
        where: { id: loanId },
        include: { asset: true },
      })

      if (!loan) throw new Error("Loan not found.")
      if (loan.status !== "LENT_OUT" && loan.status !== "APPROVED") {
        throw new Error(`Cannot mark loan as returned when status is "${loan.status}".`)
      }

      // Restock the asset
      await tx.marketingAsset.update({
        where: { id: loan.assetId },
        data: {
          availableQuantity: { increment: loan.quantity },
          ...(data.conditionOnReturn && data.conditionOnReturn !== "Good"
            ? { condition: data.conditionOnReturn }
            : {}),
        },
      })

      const updated = await tx.marketingAssetLoan.update({
        where: { id: loanId },
        data: {
          status: "RETURNED",
          actualReturn: new Date(),
          returnedBy: data.returnedBy?.trim() || loan.borrowerName,
          conditionOnReturn: data.conditionOnReturn || "Good",
          returnedNotes: data.returnedNotes?.trim() || null,
        },
      })

      return { updated, asset: loan.asset }
    })

    revalidatePath("/marketing/assets")

    await logUserAction(
      "Returned Marketing Asset",
      `Recorded return of ${result.asset.name} (${result.updated.loanNumber}). Returned by: ${data.returnedBy || result.updated.borrowerName}. Condition: ${data.conditionOnReturn || "Good"}. Handled by: ${handler}.`
    )

    return { success: true, data: result.updated }
  } catch (error: any) {
    console.error("Failed to return asset:", error)
    return { success: false, error: error.message }
  }
}

export async function uploadMarketingAssetPhotoAction(formData: FormData) {
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
    console.error("Failed to upload asset photo:", error)
    return { success: false, error: error.message }
  }
}
