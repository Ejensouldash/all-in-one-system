import { renderToStream } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { EInvoiceDocument, type EInvoicePdfData } from "@/lib/pdf/EInvoiceDocument"
import { putR2Object } from "@/lib/sales-ordering/r2"

/**
 * Renders an E-Invoice PDF into a Buffer in memory using @react-pdf/renderer
 */
export async function generateEInvoicePdfBuffer(data: EInvoicePdfData): Promise<Buffer> {
  let logoSource: string | undefined

  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    logoSource = `data:image/png;base64,${logoBuffer.toString("base64")}`
  } catch (err) {
    console.warn("[generateEInvoicePdfBuffer] Logo file not found or unreadable, rendering without logo:", err)
  }

  const pdfStream = await renderToStream(
    EInvoiceDocument({
      data,
      logoSource,
    })
  )

  const chunks: Buffer[] = []
  return new Promise<Buffer>((resolve, reject) => {
    pdfStream.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)))
    pdfStream.on("error", err => reject(err))
  })
}

/**
 * Loads an intake record, compiles its vector PDF, uploads to Cloudflare R2,
 * and updates the intake record with the permanent R2 object key.
 */
export async function generateAndSaveEInvoicePdfToR2(intakeId: string): Promise<{ r2ObjectKey: string; buffer: Buffer }> {
  const intake = await prisma.salesDocumentIntake.findUnique({
    where: { id: intakeId },
  })

  if (!intake) {
    throw new Error(`SalesDocumentIntake with id ${intakeId} not found`)
  }

  const raw = (intake.extractedData as any) || {}
  const safeDoc = String(raw.documentNumber || intake.id).replace(/[^a-zA-Z0-9_-]/g, "_")
  const safeIc = String(raw.icNumber || "NOIC").replace(/[^a-zA-Z0-9_-]/g, "_")
  const year = new Date().getFullYear()
  const r2ObjectKey = `e-invoices/${year}/${intake.id}/E_Invoice_${safeIc}_${safeDoc}.pdf`

  const pdfData: EInvoicePdfData = {
    documentNumber: raw.documentNumber || `E-INV-${intake.id.slice(0, 8).toUpperCase()}`,
    documentDate: raw.documentDate || new Date(intake.createdAt).toISOString().slice(0, 10),
    customerName: raw.customerName || raw.companyName || raw.fullName || "Customer",
    companyName: raw.companyName || null,
    ssmNumber: raw.ssmNumber || raw.ssmCert || null,
    picPhone: raw.picPhone || null,
    fullName: raw.fullName || raw.customerName || null,
    icNumber: raw.icNumber || null,
    phone: raw.deliveryPhone || raw.phone || null,
    email: raw.deliveryEmail || raw.email || null,
    deliveryAddress: raw.deliveryAddress || raw.billingAddress || "Direct Delivery",
    deliveryMode: raw.deliveryMode || "Direct Delivery",
    currency: raw.currency || "MYR",
    lines: Array.isArray(raw.lines) ? raw.lines : [],
    subtotal: Number(raw.totals?.subtotal || 0),
    taxTotal: Number(raw.totals?.tax || 0),
    freightTotal: Number(raw.totals?.freight || 0),
    grandTotal: Number(raw.totals?.grandTotal || 0),
    remarks: raw.remarks || null,
    createdAt: intake.createdAt,
  }

  const buffer = await generateEInvoicePdfBuffer(pdfData)

  // Upload to Cloudflare R2
  await putR2Object(r2ObjectKey, buffer, "application/pdf")

  // Update intake record to point to the PDF in R2
  await prisma.salesDocumentIntake.update({
    where: { id: intake.id },
    data: {
      r2ObjectKey,
      mimeType: "application/pdf",
      fileSize: buffer.length,
    },
  })

  return { r2ObjectKey, buffer }
}
