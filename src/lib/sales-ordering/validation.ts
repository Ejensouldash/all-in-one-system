import { prisma } from "@/lib/prisma"
import type { ExtractedSalesDocument, SalesValidationIssue } from "./types"

const moneyClose = (a: number, b: number) => Math.abs(a - b) <= 0.02
const normaliseMatchText = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")

async function matchCustomer(document: ExtractedSalesDocument) {
  const reference = document.customerReference.trim()
  const name = document.customerName.trim()
  if (reference) {
    const exact = await prisma.customer.findFirst({ where: { OR: [{ customerCode: { equals: reference, mode: "insensitive" } }, { sageCustomerId: { equals: reference, mode: "insensitive" } }] }, include: { addresses: true } })
    if (exact) return exact
  }
  if (!name) return null
  const candidates = await prisma.customer.findMany({
    where: { OR: [{ legalName: { contains: name, mode: "insensitive" } }, { tradingName: { contains: name, mode: "insensitive" } }] },
    include: { addresses: true },
    take: 20,
  })
  const normalisedName = normaliseMatchText(name)
  return candidates.find(customer => [customer.legalName, customer.tradingName || ""].some(candidate => {
    const normalisedCandidate = normaliseMatchText(candidate)
    return normalisedCandidate === normalisedName || (normalisedName.length >= 5 && (normalisedCandidate.includes(normalisedName) || normalisedName.includes(normalisedCandidate)))
  })) || null
}

export async function validateExtractedSalesDocument(document: ExtractedSalesDocument) {
  const issues: SalesValidationIssue[] = []

  const customer = await matchCustomer(document)

  if (!customer) {
    issues.push({ code: "CUSTOMER_NOT_MATCHED", severity: "ERROR", field: "customer", message: "Customer could not be matched with Customer Master." })
  }
  if (!document.poNumber && document.documentType === "PURCHASE_ORDER") {
    issues.push({ code: "PO_NUMBER_MISSING", severity: "ERROR", field: "poNumber", message: "PO number was not found." })
  }
  if (!document.deliveryAddress) {
    issues.push({ code: "DELIVERY_ADDRESS_MISSING", severity: "ERROR", field: "deliveryAddress", message: "Delivery address must be verified." })
  }
  if (!document.lines.length) {
    issues.push({ code: "NO_ITEMS", severity: "ERROR", field: "lines", message: "No product line items were detected." })
  }

  const knownSkus = new Set((await prisma.inventoryBatch.findMany({ select: { sku: true }, distinct: ["sku"] })).map(item => item.sku.toUpperCase()))
  document.lines.forEach((item, index) => {
    if (!item.quantity) issues.push({ code: "INVALID_QUANTITY", severity: "ERROR", field: `lines.${index}.quantity`, message: `Quantity for item ${index + 1} is empty or zero.` })
    if (item.sku && knownSkus.size > 0 && !knownSkus.has(item.sku.toUpperCase())) {
      issues.push({ code: "UNKNOWN_SKU", severity: "WARNING", field: `lines.${index}.sku`, message: `SKU ${item.sku} not found in current inventory.` })
    }
    const calculated = item.quantity * item.unitPrice - item.discount + item.tax
    if (item.amount > 0 && !moneyClose(calculated, item.amount)) {
      issues.push({ code: "LINE_TOTAL_MISMATCH", severity: "WARNING", field: `lines.${index}.amount`, message: `Line total for item ${index + 1} does not match quantity and unit price.` })
    }
  })

  const lineTotal = [...document.lines, ...document.charges].reduce((sum, item) => sum + item.amount, 0)
  if (document.totals.grandTotal > 0 && !moneyClose(lineTotal, document.totals.grandTotal)) {
    issues.push({ code: "GRAND_TOTAL_MISMATCH", severity: "WARNING", field: "totals.grandTotal", message: "Document grand total does not match line items total." })
  }
  if (document.confidence < 0.75) {
    issues.push({ code: "LOW_CONFIDENCE", severity: "WARNING", message: "Low AI confidence; please review all fields carefully." })
  }

  document.warnings.forEach(message => issues.push({ code: "AI_WARNING", severity: "WARNING", message }))
  return { customer, issues }
}
