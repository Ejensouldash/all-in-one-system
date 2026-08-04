import { prisma } from "@/lib/prisma"
import type { ExtractedSalesDocument, SalesValidationIssue } from "./types"

const moneyClose = (a: number, b: number) => Math.abs(a - b) <= 0.02

export async function validateExtractedSalesDocument(document: ExtractedSalesDocument) {
  const issues: SalesValidationIssue[] = []

  const customer = document.customerReference
    ? await prisma.customer.findFirst({
        where: {
          OR: [
            { customerCode: { equals: document.customerReference, mode: "insensitive" } },
            { sageCustomerId: { equals: document.customerReference, mode: "insensitive" } },
          ],
        },
        include: { addresses: true },
      })
    : document.customerName
      ? await prisma.customer.findFirst({
          where: { legalName: { equals: document.customerName, mode: "insensitive" } },
          include: { addresses: true },
        })
      : null

  if (!customer) {
    issues.push({ code: "CUSTOMER_NOT_MATCHED", severity: "ERROR", field: "customer", message: "Customer tidak dapat dipadankan dengan Customer Master." })
  }
  if (!document.poNumber && document.documentType === "PURCHASE_ORDER") {
    issues.push({ code: "PO_NUMBER_MISSING", severity: "ERROR", field: "poNumber", message: "Nombor PO tidak dijumpai." })
  }
  if (!document.deliveryAddress) {
    issues.push({ code: "DELIVERY_ADDRESS_MISSING", severity: "ERROR", field: "deliveryAddress", message: "Alamat penghantaran perlu disahkan." })
  }
  if (!document.lines.length) {
    issues.push({ code: "NO_ITEMS", severity: "ERROR", field: "lines", message: "Tiada item produk berjaya dibaca." })
  }

  const knownSkus = new Set((await prisma.inventoryBatch.findMany({ select: { sku: true }, distinct: ["sku"] })).map(item => item.sku.toUpperCase()))
  document.lines.forEach((item, index) => {
    if (!item.quantity) issues.push({ code: "INVALID_QUANTITY", severity: "ERROR", field: `lines.${index}.quantity`, message: `Quantity item ${index + 1} kosong atau sifar.` })
    if (item.sku && knownSkus.size > 0 && !knownSkus.has(item.sku.toUpperCase())) {
      issues.push({ code: "UNKNOWN_SKU", severity: "WARNING", field: `lines.${index}.sku`, message: `SKU ${item.sku} tidak ditemui dalam inventory semasa.` })
    }
    const calculated = item.quantity * item.unitPrice - item.discount + item.tax
    if (item.amount > 0 && !moneyClose(calculated, item.amount)) {
      issues.push({ code: "LINE_TOTAL_MISMATCH", severity: "WARNING", field: `lines.${index}.amount`, message: `Jumlah item ${index + 1} tidak sepadan dengan quantity dan harga.` })
    }
  })

  const lineTotal = [...document.lines, ...document.charges].reduce((sum, item) => sum + item.amount, 0)
  if (document.totals.grandTotal > 0 && !moneyClose(lineTotal, document.totals.grandTotal)) {
    issues.push({ code: "GRAND_TOTAL_MISMATCH", severity: "WARNING", field: "totals.grandTotal", message: "Grand total dokumen tidak sepadan dengan jumlah line." })
  }
  if (document.confidence < 0.75) {
    issues.push({ code: "LOW_CONFIDENCE", severity: "WARNING", message: "AI confidence rendah; semua field perlu disemak dengan teliti." })
  }

  document.warnings.forEach(message => issues.push({ code: "AI_WARNING", severity: "WARNING", message }))
  return { customer, issues }
}

