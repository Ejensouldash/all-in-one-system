import { NextResponse } from "next/server"
import * as xlsx from "xlsx"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, canManageSalesOrderingCustomers, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export const runtime = "nodejs"
export const maxDuration = 300

type Row = Record<string, unknown>

const value = (row: Row, key: string) => String(row[key] ?? "").trim()
const cleanOptional = (input: string) => input && input !== "#N/A" ? input : null

function findHeaderSheet(workbook: xlsx.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const rows = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false, blankrows: false })
    const headerRowIndex = rows.findIndex(row => Array.isArray(row) && row.some(cell => String(cell).trim() === "Customer ID"))
    if (headerRowIndex >= 0) return { sheetName, sheet: workbook.Sheets[sheetName], headerRowIndex }
  }
  return null
}

function parseCreditTerms(raw: string) {
  const normal = raw.trim().toUpperCase()
  const dayMatch = normal.match(/^(\d{1,3})(?:\s*DAYS?)?$/)
  if (dayMatch) return { days: Number(dayMatch[1]), policy: "CREDIT" }
  if (normal.includes("DEPOSIT")) return { days: null, policy: "DEPOSIT" }
  if (normal === "CASH") return { days: null, policy: "CASH" }
  if (normal === "COD") return { days: null, policy: "COD" }
  return { days: null, policy: normal ? "OTHER" : null }
}

export async function POST(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "customers") || !canManageSalesOrderingCustomers(access)) {
    return NextResponse.json({ error: "Akses import Customer Master diperlukan." }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "Fail Excel diperlukan." }, { status: 400 })
    if (!/\.xlsx?$/i.test(file.name)) return NextResponse.json({ error: "Hanya fail .xlsx atau .xls dibenarkan." }, { status: 400 })
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Fail melebihi 25 MB." }, { status: 400 })

    const workbook = xlsx.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true })
    const masterSource = findHeaderSheet(workbook)
    if (!masterSource) return NextResponse.json({ error: "Lajur Customer ID tidak ditemui dalam workbook." }, { status: 400 })

    const masterRows = xlsx.utils.sheet_to_json<Row>(masterSource.sheet, { range: masterSource.headerRowIndex, defval: "", raw: false })
    const addressRows = workbook.Sheets.Address
      ? xlsx.utils.sheet_to_json<Row>(workbook.Sheets.Address, { range: 1, defval: "", raw: false })
      : []
    const addressById = new Map<string, Row>()
    for (const row of addressRows) {
      const id = value(row, "ID")
      if (id) addressById.set(id, row)
    }

    const rows = masterRows.filter(row => value(row, "Customer ID"))
    if (!rows.length) return NextResponse.json({ error: "Tiada rekod Customer ID ditemui dalam tab Master." }, { status: 400 })

    let created = 0
    let updated = 0
    let needsReview = 0
    const batchSize = 100

    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize)
      await prisma.$transaction(async tx => {
        for (const row of batch) {
          const customerCode = value(row, "Customer ID")
          const sourceAddress: Row = addressById.get(customerCode) || {}
          const legalName = cleanOptional(value(row, "Description(1)")) || customerCode
          const creditTermsRaw = cleanOptional(value(row, "CT") || value(sourceAddress, "CT"))
          const credit = parseCreditTerms(creditTermsRaw || "")
          const existing = await tx.customer.findUnique({ where: { customerCode }, select: { id: true } })
          const status = legalName === customerCode ? "NEEDS_REVIEW" : "READY"
          if (status === "NEEDS_REVIEW") needsReview++

          const customer = await tx.customer.upsert({
            where: { customerCode },
            create: {
              customerCode,
              sageCustomerId: cleanOptional(value(row, "SageID")),
              legalName,
              tradingName: cleanOptional(value(row, "Description(2)")),
              pic: cleanOptional(value(row, "PIC") || value(sourceAddress, "PIC")),
              email: cleanOptional(value(row, "Email Address (only 1 is required for eInvoice)")),
              phonePrimary: cleanOptional(value(row, "Phone No.(1) - required format -no dash, no spacing,no extension code or text (example '017396624)") || value(sourceAddress, "Phone No.(1)")),
              phoneSecondary: cleanOptional(value(row, "Phone No.(2)") || value(sourceAddress, "Phone No.(2)")),
              customerType: cleanOptional(value(row, "NewType") || value(row, "Type") || value(sourceAddress, "Type")),
              customerSubtype: cleanOptional(value(row, "Subtype") || value(sourceAddress, "Subtype")),
              categoryCode: cleanOptional(value(row, "Category Code")),
              zone: cleanOptional(value(sourceAddress, "Zone")),
              region: cleanOptional(value(row, "Region") || value(sourceAddress, "State2")),
              creditTermsRaw,
              creditTermDays: credit.days,
              paymentPolicy: credit.policy,
              salesRep1: cleanOptional(value(row, "SALES REP 1")),
              salesRep2: cleanOptional(value(row, "SALES REP 2")),
              companyRegistrationNo: cleanOptional(value(row, "Company Registration No (New)/NRIC/Passport/Army No")),
              tinNo: cleanOptional(value(row, "TIN Number")),
              sstNo: cleanOptional(value(row, "SST Number (If applicable)")),
              importStatus: status,
              sourceData: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
            },
            update: {
              sageCustomerId: cleanOptional(value(row, "SageID")),
              legalName,
              tradingName: cleanOptional(value(row, "Description(2)")),
              pic: cleanOptional(value(row, "PIC") || value(sourceAddress, "PIC")),
              email: cleanOptional(value(row, "Email Address (only 1 is required for eInvoice)")),
              phonePrimary: cleanOptional(value(row, "Phone No.(1) - required format -no dash, no spacing,no extension code or text (example '017396624)") || value(sourceAddress, "Phone No.(1)")),
              phoneSecondary: cleanOptional(value(row, "Phone No.(2)") || value(sourceAddress, "Phone No.(2)")),
              customerType: cleanOptional(value(row, "NewType") || value(row, "Type") || value(sourceAddress, "Type")),
              customerSubtype: cleanOptional(value(row, "Subtype") || value(sourceAddress, "Subtype")),
              categoryCode: cleanOptional(value(row, "Category Code")),
              zone: cleanOptional(value(sourceAddress, "Zone")),
              region: cleanOptional(value(row, "Region") || value(sourceAddress, "State2")),
              creditTermsRaw,
              creditTermDays: credit.days,
              paymentPolicy: credit.policy,
              salesRep1: cleanOptional(value(row, "SALES REP 1")),
              salesRep2: cleanOptional(value(row, "SALES REP 2")),
              companyRegistrationNo: cleanOptional(value(row, "Company Registration No (New)/NRIC/Passport/Army No")),
              tinNo: cleanOptional(value(row, "TIN Number")),
              sstNo: cleanOptional(value(row, "SST Number (If applicable)")),
              importStatus: status,
              sourceData: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
            },
          })

          const fullAddress = cleanOptional(value(row, "Full Address") || value(sourceAddress, "Full Address"))
          await tx.customerAddress.upsert({
            where: { customerId_label: { customerId: customer.id, label: "Master Address" } },
            create: {
              customerId: customer.id,
              label: "Master Address",
              addressType: "BILLING",
              attentionTo: customer.pic,
              phone: customer.phonePrimary,
              addressLine1: cleanOptional(value(row, "Address Line 1 (30 char)") || value(sourceAddress, "Address")),
              addressLine2: cleanOptional(value(row, "Address Line 2 (30 char)") || value(sourceAddress, "Street")),
              addressLine3: cleanOptional(value(row, "Address Line 3 (30 char)") || value(sourceAddress, "City")),
              city: cleanOptional(value(row, "City")),
              state: cleanOptional(value(sourceAddress, "State2")),
              postcode: cleanOptional(value(row, "Postal Code")),
              country: cleanOptional(value(row, "Country")) || "MALAYSIA",
              fullAddress,
              isDefaultBilling: true,
              isDefaultDelivery: true,
              sourceRowReference: customerCode,
            },
            update: {
              attentionTo: customer.pic,
              phone: customer.phonePrimary,
              addressLine1: cleanOptional(value(row, "Address Line 1 (30 char)") || value(sourceAddress, "Address")),
              addressLine2: cleanOptional(value(row, "Address Line 2 (30 char)") || value(sourceAddress, "Street")),
              addressLine3: cleanOptional(value(row, "Address Line 3 (30 char)") || value(sourceAddress, "City")),
              city: cleanOptional(value(row, "City")),
              state: cleanOptional(value(sourceAddress, "State2")),
              postcode: cleanOptional(value(row, "Postal Code")),
              country: cleanOptional(value(row, "Country")) || "MALAYSIA",
              fullAddress,
            },
          })
          if (existing) updated++
          else created++
        }
      }, { timeout: 60000 })
    }

    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Sales Ordering User",
        action: "CUSTOMER_MASTER_IMPORTED",
        details: JSON.stringify({ fileName: file.name, total: rows.length, created, updated, needsReview }),
      },
    })

    return NextResponse.json({ success: true, sheetName: masterSource.sheetName, total: rows.length, created, updated, needsReview })
  } catch (error) {
    console.error("Customer master import error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import Customer Master gagal." }, { status: 500 })
  }
}
