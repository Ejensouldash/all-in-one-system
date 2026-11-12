"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canAccessProcurement, canManageProcurementFinance } from "@/lib/access"
import {
  ProcurementPaymentTerm,
  ProcurementInvoiceCategory,
  ProcurementInvoiceStatus,
  ProcurementComparisonStatus,
} from "@prisma/client"
import { uploadProcurementFile } from "@/lib/procurement-storage"

export async function checkProcurementAccess() {
  const access = await getAccessInfo()
  if (!access || !canAccessProcurement(access)) {
    throw new Error("Access Denied: You do not have permission to access Procurement Management.")
  }
  return access
}

// ----------------------------------------------------------------------
// SUPPLIER ACTIONS
// ----------------------------------------------------------------------

export async function getSuppliers(params?: {
  search?: string
  terms?: string
  branch?: string
  department?: string
  company?: string
  activeOnly?: boolean
}) {
  await checkProcurementAccess()

  const where: any = {}
  if (params?.activeOnly !== false) {
    where.isActive = true
  }

  if (params?.terms && params.terms !== "ALL") {
    where.terms = params.terms as ProcurementPaymentTerm
  }

  if (params?.department && params.department !== "ALL") {
    where.department = params.department
  }

  const andConditions: any[] = []

  if (params?.company && params.company !== "ALL") {
    andConditions.push({
      OR: [
        { company: params.company },
        { company: "All Companies" },
        { company: null },
      ],
    })
  }

  if (params?.branch && params.branch !== "ALL") {
    // If filtering by branch (e.g. Gambang), include suppliers that match this branch or "All Branches" or NULL
    andConditions.push({
      OR: [
        { branch: params.branch },
        { branch: "All Branches" },
        { branch: null },
      ],
    })
  }

  if (params?.search?.trim()) {
    const q = params.search.trim()
    andConditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
        { branch: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { remark: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  const suppliers = await prisma.procurementSupplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { invoices: true },
      },
    },
  })

  return suppliers
}

export async function createSupplier(data: {
  name: string
  phone?: string
  email?: string
  contactPerson?: string
  branch?: string
  department?: string
  company?: string
  terms: ProcurementPaymentTerm
  remark?: string
}) {
  const access = await checkProcurementAccess()

  if (!data.name?.trim()) {
    return { success: false, error: "Supplier name is required." }
  }

  try {
    const supplier = await prisma.procurementSupplier.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        branch: data.branch?.trim() || "All Branches",
        department: data.department?.trim() || null,
        company: data.company?.trim() || "All Companies",
        terms: data.terms || ProcurementPaymentTerm.TERM_30_DAYS,
        remark: data.remark?.trim() || null,
        createdById: access.userId,
      },
    })

    revalidatePath("/procurement/suppliers")
    revalidatePath("/procurement/invoices")
    return { success: true, supplier }
  } catch (error: any) {
    console.error("Failed to create supplier:", error)
    return { success: false, error: error.message || "Failed to create supplier." }
  }
}

export async function updateSupplier(
  id: string,
  data: {
    name: string
    phone?: string
    email?: string
    contactPerson?: string
    branch?: string
    department?: string
    company?: string
    terms: ProcurementPaymentTerm
    remark?: string
    isActive?: boolean
  }
) {
  await checkProcurementAccess()

  try {
    const updated = await prisma.procurementSupplier.update({
      where: { id },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        branch: data.branch?.trim() || "All Branches",
        department: data.department?.trim() || null,
        company: data.company?.trim() || "All Companies",
        terms: data.terms,
        remark: data.remark?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    })

    revalidatePath("/procurement/suppliers")
    revalidatePath("/procurement/invoices")
    return { success: true, supplier: updated }
  } catch (error: any) {
    console.error("Failed to update supplier:", error)
    return { success: false, error: error.message || "Failed to update supplier." }
  }
}

export async function deleteSupplier(id: string) {
  await checkProcurementAccess()

  try {
    // Check if supplier has linked invoices
    const count = await prisma.procurementInvoice.count({
      where: { supplierId: id },
    })

    if (count > 0) {
      // Deactivate instead of hard delete
      await prisma.procurementSupplier.update({
        where: { id },
        data: { isActive: false },
      })
      revalidatePath("/procurement/suppliers")
      return { success: true, message: "Supplier has existing invoices and was deactivated instead of deleted." }
    }

    await prisma.procurementSupplier.delete({
      where: { id },
    })

    revalidatePath("/procurement/suppliers")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete supplier:", error)
    return { success: false, error: error.message || "Failed to delete supplier." }
  }
}

// ----------------------------------------------------------------------
// INVOICE ACTIONS
// ----------------------------------------------------------------------

export async function getInvoices(params?: {
  category?: ProcurementInvoiceCategory | "ALL"
  status?: ProcurementInvoiceStatus | "ALL"
  company?: string
  department?: string
  supplierId?: string
  dateType?: "submitDate" | "invoiceDate" | "dueDate" | "paidAt"
  startDate?: string | Date
  endDate?: string | Date
  doReceived?: boolean | "ALL"
  originalInvoiceReceived?: boolean | "ALL"
  search?: string
}) {
  await checkProcurementAccess()

  const where: any = {}

  if (params?.category && params.category !== "ALL") {
    if (params.category === "DEPOSIT_PAYMENT" || (params.category as string) === "MONTHLY_SUBSCRIPTION") {
      where.category = { in: ["DEPOSIT_PAYMENT", "MONTHLY_SUBSCRIPTION"] }
    } else {
      where.category = params.category as ProcurementInvoiceCategory
    }
  }

  if (params?.status && params.status !== "ALL") {
    where.status = params.status as ProcurementInvoiceStatus
  }

  if (params?.company && params.company !== "ALL") {
    where.company = params.company
  }

  if (params?.department && params.department !== "ALL") {
    where.department = params.department
  }

  if (params?.supplierId && params.supplierId !== "ALL") {
    where.supplierId = params.supplierId
  }

  if (params?.doReceived !== undefined && params.doReceived !== "ALL") {
    where.doReceived = Boolean(params.doReceived === true)
  }

  if (params?.originalInvoiceReceived !== undefined && params.originalInvoiceReceived !== "ALL") {
    where.originalInvoiceReceived = Boolean(params.originalInvoiceReceived === true)
  }

  if (params?.startDate || params?.endDate) {
    const field = params.dateType || "submitDate"
    where[field] = {}
    if (params.startDate) {
      const s = new Date(params.startDate)
      s.setHours(0, 0, 0, 0)
      where[field].gte = s
    }
    if (params.endDate) {
      const e = new Date(params.endDate)
      e.setHours(23, 59, 59, 999)
      where[field].lte = e
    }
  }

  if (params?.search?.trim()) {
    const q = params.search.trim()
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { poNumber: { contains: q, mode: "insensitive" } },
      { supplier: { name: { contains: q, mode: "insensitive" } } },
      { notes: { contains: q, mode: "insensitive" } },
    ]
  }

  const invoices = await prisma.procurementInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          terms: true,
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      paidBy: {
        select: { id: true, name: true, email: true },
      },
      activityLogs: {
        orderBy: { createdAt: "asc" },
        include: {
          performedBy: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  return invoices
}

export async function getProcurementSummary() {
  await checkProcurementAccess()

  const [totalInvoices, pendingFinance, inReview, paid, cashPrepaymentPending] = await Promise.all([
    prisma.procurementInvoice.aggregate({
      _count: true,
      _sum: { amount: true },
    }),
    prisma.procurementInvoice.aggregate({
      where: { status: ProcurementInvoiceStatus.PENDING_FINANCE },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.procurementInvoice.aggregate({
      where: { status: ProcurementInvoiceStatus.IN_REVIEW },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.procurementInvoice.aggregate({
      where: { status: ProcurementInvoiceStatus.PAID },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.procurementInvoice.aggregate({
      where: {
        category: ProcurementInvoiceCategory.CASH_PREPAYMENT,
        status: { in: [ProcurementInvoiceStatus.PENDING_FINANCE, ProcurementInvoiceStatus.IN_REVIEW] },
      },
      _count: true,
      _sum: { amount: true },
    }),
  ])

  // Count overdue or due within 3 days
  const now = new Date()
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  const dueSoonOrOverdueCount = await prisma.procurementInvoice.count({
    where: {
      status: { in: [ProcurementInvoiceStatus.PENDING_FINANCE, ProcurementInvoiceStatus.IN_REVIEW] },
      dueDate: {
        lte: threeDaysLater,
      },
    },
  })

  return {
    totalCount: totalInvoices._count || 0,
    totalAmount: totalInvoices._sum.amount || 0,
    pendingFinanceCount: pendingFinance._count || 0,
    pendingFinanceAmount: pendingFinance._sum.amount || 0,
    inReviewCount: inReview._count || 0,
    inReviewAmount: inReview._sum.amount || 0,
    paidCount: paid._count || 0,
    paidAmount: paid._sum.amount || 0,
    cashPrepaymentPendingCount: cashPrepaymentPending._count || 0,
    cashPrepaymentPendingAmount: cashPrepaymentPending._sum.amount || 0,
    dueSoonOrOverdueCount,
  }
}

export async function createInvoice(data: {
  invoiceNumber: string
  poNumber?: string
  company: string
  department: string
  supplierId: string
  category: ProcurementInvoiceCategory
  status?: ProcurementInvoiceStatus
  invoiceDate?: string | Date
  dueDate?: string | Date
  amount: number
  totalPrice?: number | null
  depositDetails?: any
  doReceived?: boolean
  originalInvoiceReceived?: boolean
  proformaInvoiceReceived?: boolean
  pdfReceived?: boolean
  attachmentUrl?: string
  attachmentName?: string
  attachments?: Array<{ url: string; name: string; size?: number; tag?: string }>
  notes?: string
}) {
  const access = await checkProcurementAccess()

  if (!data.invoiceNumber?.trim()) {
    return { success: false, error: "Invoice number is required." }
  }
  if (!data.supplierId) {
    return { success: false, error: "Supplier is required." }
  }
  if (!data.company) {
    return { success: false, error: "Company is required." }
  }
  if (!data.department) {
    return { success: false, error: "Department is required." }
  }

  const initialStatus = data.status || ProcurementInvoiceStatus.PENDING_FINANCE

  // Normalize attachments array
  let attachmentsJson: any = []
  if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
    attachmentsJson = data.attachments
  } else if (data.attachmentUrl) {
    attachmentsJson = [{ url: data.attachmentUrl, name: data.attachmentName || "Document", size: 0, tag: "Invoice / DO" }]
  }

  const primaryAttachmentUrl = data.attachmentUrl || data.attachments?.[0]?.url || null
  const primaryAttachmentName = data.attachmentName || data.attachments?.[0]?.name || null

  try {
    const invoice = await prisma.procurementInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber.trim(),
        poNumber: data.poNumber?.trim() || null,
        company: data.company,
        department: data.department,
        supplierId: data.supplierId,
        category: data.category,
        status: initialStatus,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        submitDate: new Date(),
        amount: Number(data.amount) || 0,
        totalPrice: data.totalPrice !== undefined && data.totalPrice !== null ? Number(data.totalPrice) : null,
        depositDetails: data.depositDetails || null,
        doReceived: !!data.doReceived,
        originalInvoiceReceived: !!data.originalInvoiceReceived,
        proformaInvoiceReceived: !!data.proformaInvoiceReceived,
        pdfReceived: !!data.pdfReceived,
        attachmentUrl: primaryAttachmentUrl,
        attachmentName: primaryAttachmentName,
        attachments: attachmentsJson,
        notes: data.notes?.trim() || null,
        createdById: access.userId,
        activityLogs: {
          create: {
            action: initialStatus === ProcurementInvoiceStatus.DRAFT ? "CREATED_DRAFT" : "SUBMITTED_TO_FINANCE",
            toStatus: initialStatus,
            notes: `Submitted by ${access.name || "Purchasing"}`,
            performedById: access.userId,
          },
        },
      },
    })

    revalidatePath("/procurement/invoices")
    return { success: true, invoice }
  } catch (error: any) {
    console.error("Failed to create invoice:", error)
    return { success: false, error: error.message || "Failed to create invoice." }
  }
}

export async function updateInvoice(
  id: string,
  data: {
    invoiceNumber?: string
    poNumber?: string
    company?: string
    department?: string
    supplierId?: string
    category?: ProcurementInvoiceCategory
    invoiceDate?: string | Date
    dueDate?: string | Date
    amount?: number
    totalPrice?: number | null
    depositDetails?: any
    doReceived?: boolean
    originalInvoiceReceived?: boolean
    proformaInvoiceReceived?: boolean
    pdfReceived?: boolean
    attachmentUrl?: string
    attachmentName?: string
    attachments?: Array<{ url: string; name: string; size?: number; tag?: string }>
    notes?: string
  }
) {
  const access = await checkProcurementAccess()

  try {
    const updatePayload: any = {}
    if (data.invoiceNumber) updatePayload.invoiceNumber = data.invoiceNumber.trim()
    if (data.poNumber !== undefined) updatePayload.poNumber = data.poNumber?.trim() || null
    if (data.company) updatePayload.company = data.company
    if (data.department) updatePayload.department = data.department
    if (data.supplierId) updatePayload.supplierId = data.supplierId
    if (data.category) updatePayload.category = data.category
    if (data.invoiceDate) updatePayload.invoiceDate = new Date(data.invoiceDate)
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null
    if (data.amount !== undefined) updatePayload.amount = Number(data.amount) || 0
    if (data.totalPrice !== undefined) updatePayload.totalPrice = data.totalPrice !== null ? Number(data.totalPrice) : null
    if (data.depositDetails !== undefined) updatePayload.depositDetails = data.depositDetails
    if (data.doReceived !== undefined) updatePayload.doReceived = data.doReceived
    if (data.originalInvoiceReceived !== undefined) updatePayload.originalInvoiceReceived = data.originalInvoiceReceived
    if (data.proformaInvoiceReceived !== undefined) updatePayload.proformaInvoiceReceived = data.proformaInvoiceReceived
    if (data.pdfReceived !== undefined) updatePayload.pdfReceived = data.pdfReceived
    if (data.attachmentUrl !== undefined) updatePayload.attachmentUrl = data.attachmentUrl
    if (data.attachmentName !== undefined) updatePayload.attachmentName = data.attachmentName
    if (data.attachments !== undefined) {
      updatePayload.attachments = data.attachments
      if (Array.isArray(data.attachments) && data.attachments.length > 0) {
        updatePayload.attachmentUrl = data.attachments[0].url
        updatePayload.attachmentName = data.attachments[0].name
      } else {
        updatePayload.attachmentUrl = null
        updatePayload.attachmentName = null
      }
    }
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null

    const updated = await prisma.procurementInvoice.update({
      where: { id },
      data: updatePayload,
    })

    revalidatePath("/procurement/invoices")
    return { success: true, invoice: updated }
  } catch (error: any) {
    console.error("Failed to update invoice:", error)
    return { success: false, error: error.message || "Failed to update invoice." }
  }
}

export async function updateInvoiceStatus(
  id: string,
  newStatus: ProcurementInvoiceStatus,
  notes?: string
) {
  const access = await checkProcurementAccess()

  // Only Finance or Superadmin can change status to PAID or REJECTED
  if (
    (newStatus === ProcurementInvoiceStatus.PAID || newStatus === ProcurementInvoiceStatus.REJECTED) &&
    !canManageProcurementFinance(access)
  ) {
    return { success: false, error: "Only Finance or Superadmin can mark invoices as Paid or Rejected." }
  }

  try {
    const current = await prisma.procurementInvoice.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!current) {
      return { success: false, error: "Invoice not found." }
    }

    const updated = await prisma.procurementInvoice.update({
      where: { id },
      data: {
        status: newStatus,
        activityLogs: {
          create: {
            action: `STATUS_CHANGED_TO_${newStatus}`,
            fromStatus: current.status,
            toStatus: newStatus,
            notes: notes?.trim() || `Status updated to ${newStatus} by ${access.name || "User"}`,
            performedById: access.userId,
          },
        },
      },
    })

    revalidatePath("/procurement/invoices")
    return { success: true, invoice: updated }
  } catch (error: any) {
    console.error("Failed to update invoice status:", error)
    return { success: false, error: error.message || "Failed to update status." }
  }
}

export async function recordPayment(
  id: string,
  paymentData: {
    paidAt: string | Date
    paymentReference?: string
    paymentReceiptUrl?: string
    notes?: string
  }
) {
  const access = await checkProcurementAccess()

  if (!canManageProcurementFinance(access)) {
    return { success: false, error: "Only Finance or Superadmin can record payment." }
  }

  try {
    const current = await prisma.procurementInvoice.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!current) {
      return { success: false, error: "Invoice not found." }
    }

    const updated = await prisma.procurementInvoice.update({
      where: { id },
      data: {
        status: ProcurementInvoiceStatus.PAID,
        paidAt: new Date(paymentData.paidAt),
        paymentReference: paymentData.paymentReference?.trim() || null,
        paymentReceiptUrl: paymentData.paymentReceiptUrl || null,
        notes: paymentData.notes ? paymentData.notes.trim() : undefined,
        paidById: access.userId,
        activityLogs: {
          create: {
            action: "PAID",
            fromStatus: current.status,
            toStatus: ProcurementInvoiceStatus.PAID,
            notes: `Payment marked by Finance (${access.name || "Finance"}). Ref: ${paymentData.paymentReference || "N/A"}`,
            performedById: access.userId,
          },
        },
      },
    })

    revalidatePath("/procurement/invoices")
    return { success: true, invoice: updated }
  } catch (error: any) {
    console.error("Failed to record payment:", error)
    return { success: false, error: error.message || "Failed to record payment." }
  }
}

export async function deleteInvoice(id: string) {
  const access = await checkProcurementAccess()

  try {
    await prisma.procurementInvoice.delete({
      where: { id },
    })

    revalidatePath("/procurement/invoices")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete invoice:", error)
    return { success: false, error: error.message || "Failed to delete invoice." }
  }
}

export async function uploadProcurementDocument(formData: FormData) {
  await checkProcurementAccess()

  try {
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as "invoices" | "receipts") || "invoices"

    if (!file) {
      return { success: false, error: "No file uploaded." }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const res = await uploadProcurementFile(buffer, file.name, file.type || "application/pdf", folder)

    return {
      success: true,
      url: res.url,
      filename: res.filename,
    }
  } catch (error: any) {
    console.error("Failed to upload procurement file:", error)
    return { success: false, error: error.message || "Upload failed." }
  }
}

export async function uploadProcurementDocuments(formData: FormData) {
  await checkProcurementAccess()

  try {
    const rawFiles = formData.getAll("files") as File[]
    const folder = (formData.get("folder") as "invoices" | "receipts") || "invoices"

    if (!rawFiles || rawFiles.length === 0) {
      return { success: false, error: "No files uploaded." }
    }

    // Maximum 5 files
    const filesToUpload = rawFiles.slice(0, 5)
    const uploadedResults: Array<{ url: string; name: string; size: number }> = []

    for (const file of filesToUpload) {
      if (file && typeof file.arrayBuffer === "function") {
        const buffer = Buffer.from(await file.arrayBuffer())
        const res = await uploadProcurementFile(buffer, file.name, file.type || "application/pdf", folder)
        uploadedResults.push({
          url: res.url,
          name: res.filename,
          size: file.size || 0,
        })
      }
    }

    return {
      success: true,
      files: uploadedResults,
    }
  } catch (error: any) {
    console.error("Failed to upload procurement documents:", error)
    return { success: false, error: error.message || "Upload failed." }
  }
}

export async function getProcurementUserRole() {
  const access = await checkProcurementAccess()
  return {
    userId: access.userId,
    name: access.name,
    isSuperAdmin: access.isSuperAdmin,
    isFinance: canManageProcurementFinance(access),
    isRequester: canAccessProcurement(access),
  }
}


// ----------------------------------------------------------------------
// PURCHASES ACTIONS
// ----------------------------------------------------------------------

export async function getPurchases(params?: {
  search?: string
  company?: string
  department?: string
  supplierId?: string
  startDate?: string | Date
  endDate?: string | Date
}) {
  await checkProcurementAccess()

  const where: any = {}

  if (params?.company && params.company !== "ALL") {
    where.company = { equals: params.company, mode: "insensitive" }
  }

  if (params?.department && params.department !== "ALL") {
    where.department = { equals: params.department, mode: "insensitive" }
  }

  if (params?.supplierId && params.supplierId !== "ALL") {
    where.supplierId = params.supplierId
  }

  if (params?.startDate || params?.endDate) {
    where.purchaseDate = {}
    if (params.startDate) {
      const s = new Date(params.startDate)
      s.setHours(0, 0, 0, 0)
      where.purchaseDate.gte = s
    }
    if (params.endDate) {
      const e = new Date(params.endDate)
      e.setHours(23, 59, 59, 999)
      where.purchaseDate.lte = e
    }
  }

  if (params?.search?.trim()) {
    const q = params.search.trim()
    where.OR = [
      { itemDescription: { contains: q, mode: "insensitive" } },
      { supplierName: { contains: q, mode: "insensitive" } },
      { department: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { uom: { contains: q, mode: "insensitive" } },
      { remarks: { contains: q, mode: "insensitive" } },
    ]
  }

  const purchases = await prisma.procurementPurchase.findMany({
    where,
    orderBy: { purchaseDate: "desc" },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return purchases
}

export async function getPurchaseSummary() {
  await checkProcurementAccess()

  const totalAgg = await prisma.procurementPurchase.aggregate({
    _count: true,
    _sum: { total: true },
  })

  return {
    totalCount: totalAgg._count || 0,
    totalAmount: totalAgg._sum.total || 0,
  }
}

export async function createPurchase(data: {
  purchaseDate?: string | Date
  poNumber?: string | null
  itemDescription: string
  items?: any[]
  supplierName: string
  supplierId?: string | null
  quantity: number
  uom: string
  unitPrice: number
  total?: number
  company: string
  department?: string | null
  remarks?: string
}) {
  const access = await checkProcurementAccess()

  if (!data.itemDescription?.trim() && (!data.items || data.items.length === 0)) {
    return { success: false, error: "Description of the item is required." }
  }
  if (!data.supplierName?.trim()) {
    return { success: false, error: "Supplier name is required." }
  }
  if (!data.company?.trim()) {
    return { success: false, error: "Company is required." }
  }

  let finalItems = Array.isArray(data.items) ? data.items : []
  let quantity = Number(data.quantity) || 1
  let unitPrice = Number(data.unitPrice) || 0
  let total = data.total !== undefined && !isNaN(Number(data.total)) ? Number(data.total) : quantity * unitPrice
  let uom = data.uom?.trim()?.toUpperCase() || "PCS"
  let itemDescription = data.itemDescription?.trim() || ""

  if (finalItems.length > 0) {
    total = finalItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0)
    quantity = finalItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
    unitPrice = finalItems[0]?.unitPrice ? Number(finalItems[0].unitPrice) : 0
    uom = finalItems[0]?.uom ? finalItems[0].uom.toUpperCase() : "PCS"
    if (!itemDescription) {
      itemDescription = finalItems.length === 1
        ? finalItems[0].description
        : `${finalItems[0].description} (+${finalItems.length - 1} items)`
    }
  }

  const company = data.company.trim().toUpperCase()

  try {
    const purchase = await prisma.procurementPurchase.create({
      data: {
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        poNumber: data.poNumber?.trim() || null,
        itemDescription,
        items: finalItems,
        supplierName: data.supplierName.trim(),
        supplierId: data.supplierId || null,
        quantity,
        uom,
        unitPrice,
        total,
        company,
        department: data.department?.trim() || null,
        remarks: data.remarks?.trim() || null,
        createdById: access.userId,
      },
    })

    revalidatePath("/procurement/purchases")
    return { success: true, purchase }
  } catch (error: any) {
    console.error("Failed to create purchase:", error)
    return { success: false, error: error.message || "Failed to create purchase." }
  }
}

export async function updatePurchase(
  id: string,
  data: {
    purchaseDate?: string | Date
    poNumber?: string | null
    itemDescription?: string
    items?: any[]
    supplierName?: string
    supplierId?: string | null
    quantity?: number
    uom?: string
    unitPrice?: number
    total?: number
    company?: string
    department?: string | null
    remarks?: string
  }
) {
  await checkProcurementAccess()

  try {
    const existing = await prisma.procurementPurchase.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: "Purchase record not found." }
    }

    let finalItems = data.items !== undefined ? data.items : (existing.items as any[]) || []
    let quantity = data.quantity !== undefined ? Number(data.quantity) : existing.quantity
    let unitPrice = data.unitPrice !== undefined ? Number(data.unitPrice) : existing.unitPrice
    let total = data.total !== undefined ? Number(data.total) : quantity * unitPrice
    let uom = data.uom !== undefined ? data.uom.trim().toUpperCase() : existing.uom
    let itemDescription = data.itemDescription !== undefined ? data.itemDescription.trim() : existing.itemDescription

    if (Array.isArray(finalItems) && finalItems.length > 0) {
      total = finalItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0)
      quantity = finalItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
      unitPrice = finalItems[0]?.unitPrice ? Number(finalItems[0].unitPrice) : 0
      uom = finalItems[0]?.uom ? finalItems[0].uom.toUpperCase() : "PCS"
      if (!data.itemDescription) {
        itemDescription = finalItems.length === 1
          ? finalItems[0].description
          : `${finalItems[0].description} (+${finalItems.length - 1} items)`
      }
    }

    const updated = await prisma.procurementPurchase.update({
      where: { id },
      data: {
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : existing.purchaseDate,
        poNumber: data.poNumber !== undefined ? (data.poNumber ? data.poNumber.trim() : null) : existing.poNumber,
        itemDescription,
        items: finalItems,
        supplierName: data.supplierName !== undefined ? data.supplierName.trim() : existing.supplierName,
        supplierId: data.supplierId !== undefined ? data.supplierId : existing.supplierId,
        quantity,
        uom,
        unitPrice,
        total,
        company: data.company !== undefined ? data.company.trim().toUpperCase() : existing.company,
        department: data.department !== undefined ? (data.department ? data.department.trim() : null) : existing.department,
        remarks: data.remarks !== undefined ? (data.remarks ? data.remarks.trim() : null) : existing.remarks,
      },
    })

    revalidatePath("/procurement/purchases")
    return { success: true, purchase: updated }
  } catch (error: any) {
    console.error("Failed to update purchase:", error)
    return { success: false, error: error.message || "Failed to update purchase." }
  }
}

export async function deletePurchase(id: string) {
  await checkProcurementAccess()

  try {
    await prisma.procurementPurchase.delete({
      where: { id },
    })

    revalidatePath("/procurement/purchases")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete purchase:", error)
    return { success: false, error: error.message || "Failed to delete purchase." }
  }
}

// ----------------------------------------------------------------------
// PRICE COMPARISON ACTIONS
// ----------------------------------------------------------------------

export async function getPriceComparisons(params?: {
  search?: string
  status?: string
  company?: string
  department?: string
}) {
  await checkProcurementAccess()

  const where: any = {}

  if (params?.status && params.status !== "ALL") {
    where.status = params.status as ProcurementComparisonStatus
  }

  if (params?.company && params.company !== "ALL") {
    where.company = params.company
  }

  if (params?.department && params.department !== "ALL") {
    where.department = params.department
  }

  if (params?.search?.trim()) {
    const q = params.search.trim()
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { referenceNo: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { justification: { contains: q, mode: "insensitive" } },
      { awardedSupplier: { contains: q, mode: "insensitive" } },
    ]
  }

  return await prisma.procurementPriceComparison.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

export async function getPriceComparisonById(id: string) {
  await checkProcurementAccess()

  const comparison = await prisma.procurementPriceComparison.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return comparison
}

export async function createPriceComparison(data: {
  title: string
  company: string
  department: string
  referenceNo?: string
  suppliersData?: any
  itemsData?: any
  notes?: string
}) {
  const access = await checkProcurementAccess()

  let referenceNo = data.referenceNo?.trim()
  if (!referenceNo) {
    const year = new Date().getFullYear()
    const count = await prisma.procurementPriceComparison.count()
    referenceNo = `PC-${year}-${String(count + 1).padStart(4, "0")}`
  }

  try {
    const created = await prisma.procurementPriceComparison.create({
      data: {
        title: data.title.trim(),
        referenceNo,
        company: data.company,
        department: data.department,
        status: ProcurementComparisonStatus.DRAFT,
        suppliersData: data.suppliersData || [],
        itemsData: data.itemsData || [],
        notes: data.notes?.trim() || null,
        createdById: access.userId,
      },
    })

    revalidatePath("/procurement/comparisons")
    return { success: true, comparison: created }
  } catch (error: any) {
    console.error("Failed to create price comparison:", error)
    return { success: false, error: error.message || "Failed to create price comparison." }
  }
}

export async function updatePriceComparison(
  id: string,
  data: {
    title?: string
    company?: string
    department?: string
    status?: ProcurementComparisonStatus
    suppliersData?: any
    itemsData?: any
    awardedSupplier?: string | null
    justification?: string | null
    notes?: string | null
  }
) {
  await checkProcurementAccess()

  try {
    const updated = await prisma.procurementPriceComparison.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.suppliersData !== undefined && { suppliersData: data.suppliersData }),
        ...(data.itemsData !== undefined && { itemsData: data.itemsData }),
        ...(data.awardedSupplier !== undefined && { awardedSupplier: data.awardedSupplier }),
        ...(data.justification !== undefined && { justification: data.justification }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    revalidatePath("/procurement/comparisons")
    revalidatePath(`/procurement/comparisons/${id}`)
    return { success: true, comparison: updated }
  } catch (error: any) {
    console.error("Failed to update price comparison:", error)
    return { success: false, error: error.message || "Failed to update price comparison." }
  }
}

export async function deletePriceComparison(id: string) {
  await checkProcurementAccess()

  try {
    await prisma.procurementPriceComparison.delete({
      where: { id },
    })

    revalidatePath("/procurement/comparisons")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete price comparison:", error)
    return { success: false, error: error.message || "Failed to delete price comparison." }
  }
}
