/*
 * Controlled one-off / repeatable Customer Master importer.
 * Usage: node scripts/import-sales-ordering-customer-master.cjs <xlsx-file>
 *
 * Customer ID is the key. Existing customers are updated in place and no
 * customer, address, order, Production, or Warehouse records are deleted.
 */
const path = require("path")
const dotenv = require("dotenv")
const xlsx = require("xlsx")
const { Pool } = require("pg")

dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: true, quiet: true })

const sourceFile = process.argv[2]
if (!sourceFile) throw new Error("Usage: node scripts/import-sales-ordering-customer-master.cjs <xlsx-file>")

let connectionString = process.env.DATABASE_URL || ""
if (!connectionString.includes("pgbouncer=true") && connectionString.includes("pooler.supabase.com")) {
  connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true"
}
if (!connectionString) throw new Error("DATABASE_URL tidak ditemui.")

const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 10000 })
const value = (row, key) => String(row[key] ?? "").trim()
const cleanOptional = input => input && input !== "#N/A" ? input : null

function parseCreditTerms(raw) {
  const normal = raw.trim().toUpperCase()
  const dayMatch = normal.match(/^(\d{1,3})(?:\s*DAYS?)?$/)
  if (dayMatch) return { days: Number(dayMatch[1]), policy: "CREDIT" }
  if (normal.includes("DEPOSIT")) return { days: null, policy: "DEPOSIT" }
  if (normal === "CASH") return { days: null, policy: "CASH" }
  if (normal === "COD") return { days: null, policy: "COD" }
  return { days: null, policy: normal || null }
}

function findHeaderSheet(workbook) {
  for (const sheetName of workbook.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false, blankrows: false })
    const headerRowIndex = rows.findIndex(row => Array.isArray(row) && row.some(cell => String(cell).trim() === "Customer ID"))
    if (headerRowIndex >= 0) return { sheetName, sheet: workbook.Sheets[sheetName], headerRowIndex }
  }
  return null
}

function placeholders(rowCount, columnsPerRow, values) {
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = Array.from({ length: columnsPerRow }, (_, columnIndex) => {
      values.push(rowIndex * columnsPerRow + columnIndex)
      return `$${values.length}`
    })
    return `(${row.join(", ")})`
  }).join(", ")
}

function customerData(row) {
  const customerCode = value(row, "Customer ID")
  const legalName = cleanOptional(value(row, "Description(1)")) || customerCode
  const creditTermsRaw = cleanOptional(value(row, "CT"))
  const credit = parseCreditTerms(creditTermsRaw || "")
  return [
    customerCode,
    cleanOptional(value(row, "SageID")),
    legalName,
    cleanOptional(value(row, "Description(2)")),
    cleanOptional(value(row, "PIC")),
    cleanOptional(value(row, "Email Address (only 1 is required for eInvoice)")),
    cleanOptional(value(row, "Phone No.(1) - required format -no dash, no spacing,no extension code or text (example '017396624)")),
    cleanOptional(value(row, "Phone No.(2)")),
    cleanOptional(value(row, "NewType") || value(row, "Type")),
    cleanOptional(value(row, "Subtype")),
    cleanOptional(value(row, "Category Code")),
    null,
    cleanOptional(value(row, "Region")),
    creditTermsRaw,
    credit.days,
    credit.policy,
    cleanOptional(value(row, "SALES REP 1")),
    cleanOptional(value(row, "SALES REP 2")),
    cleanOptional(value(row, "Company Registration No (New)/NRIC/Passport/Army No")),
    cleanOptional(value(row, "TIN Number")),
    cleanOptional(value(row, "SST Number (If applicable)")),
    legalName === customerCode ? "NEEDS_REVIEW" : "READY",
    JSON.stringify(row),
  ]
}

async function main() {
  const workbook = xlsx.readFile(sourceFile, { cellDates: true })
  const masterSource = findHeaderSheet(workbook)
  if (!masterSource) throw new Error("Lajur Customer ID tidak ditemui dalam workbook.")
  const rows = xlsx.utils.sheet_to_json(masterSource.sheet, { range: masterSource.headerRowIndex, defval: "", raw: false }).filter(row => value(row, "Customer ID"))
  if (!rows.length) throw new Error("Tiada rekod Customer ID ditemui.")

  const existingBefore = Number((await pool.query('SELECT COUNT(*)::int AS count FROM "Customer"')).rows[0].count)
  let created = 0
  let updated = 0
  let needsReview = 0
  const batchSize = 250

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize)
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const codes = batch.map(row => value(row, "Customer ID"))
      const existing = await client.query('SELECT "customerCode" FROM "Customer" WHERE "customerCode" = ANY($1)', [codes])
      const existingCodes = new Set(existing.rows.map(row => row.customerCode))
      created += batch.length - existingCodes.size
      updated += existingCodes.size

      const customerValues = batch.flatMap(customerData)
      const customerColumns = [
        "customerCode", "sageCustomerId", "legalName", "tradingName", "pic", "email", "phonePrimary", "phoneSecondary",
        "customerType", "customerSubtype", "categoryCode", "zone", "region", "creditTermsRaw", "creditTermDays", "paymentPolicy",
        "salesRep1", "salesRep2", "companyRegistrationNo", "tinNo", "sstNo", "importStatus", "sourceData",
      ]
      const customerPlaceholders = []
      const customerRows = Array.from({ length: batch.length }, (_, rowIndex) => {
        const row = Array.from({ length: customerColumns.length }, (_, columnIndex) => `$${rowIndex * customerColumns.length + columnIndex + 1}`)
        row[row.length - 1] = `${row[row.length - 1]}::jsonb`
        return `(${row.join(", ")})`
      }).join(", ")
      const customerUpdates = customerColumns.slice(1).map(column => `"${column}" = EXCLUDED."${column}"`).join(", ")
      const customerResult = await client.query(
        `INSERT INTO "Customer" (${customerColumns.map(column => `"${column}"`).join(", ")}) VALUES ${customerRows}
         ON CONFLICT ("customerCode") DO UPDATE SET ${customerUpdates}, "updatedAt" = NOW()
         RETURNING "id", "customerCode"`,
        customerValues,
      )
      const customerIds = new Map(customerResult.rows.map(row => [row.customerCode, row.id]))

      const addressColumns = [
        "customerId", "label", "addressType", "attentionTo", "phone", "addressLine1", "addressLine2", "addressLine3",
        "city", "state", "postcode", "country", "fullAddress", "isDefaultBilling", "isDefaultDelivery", "sourceRowReference",
      ]
      const addressValues = batch.flatMap(row => {
        const customer = customerData(row)
        const customerCode = customer[0]
        const legalName = customer[2]
        if (legalName === customerCode) needsReview++
        return [
          customerIds.get(customerCode), "Master Address", "BILLING", customer[4], customer[6],
          cleanOptional(value(row, "Address Line 1 (30 char)")), cleanOptional(value(row, "Address Line 2 (30 char)")), cleanOptional(value(row, "Address Line 3 (30 char)")),
          cleanOptional(value(row, "City")), null, cleanOptional(value(row, "Postal Code")), cleanOptional(value(row, "Country")) || "MALAYSIA",
          cleanOptional(value(row, "Full Address")), true, true, customerCode,
        ]
      })
      const addressRows = Array.from({ length: batch.length }, (_, rowIndex) => {
        const row = Array.from({ length: addressColumns.length }, (_, columnIndex) => `$${rowIndex * addressColumns.length + columnIndex + 1}`)
        return `(${row.join(", ")})`
      }).join(", ")
      const addressUpdates = addressColumns.slice(3).map(column => `"${column}" = EXCLUDED."${column}"`).join(", ")
      await client.query(
        `INSERT INTO "CustomerAddress" (${addressColumns.map(column => `"${column}"`).join(", ")}) VALUES ${addressRows}
         ON CONFLICT ("customerId", "label") DO UPDATE SET ${addressUpdates}, "updatedAt" = NOW()`,
        addressValues,
      )
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
    console.log(`IMPORTED ${Math.min(start + batch.length, rows.length)}/${rows.length}`)
  }

  const auditUser = await pool.query('SELECT "id", "name" FROM "User" WHERE "role" = $1 LIMIT 1', ["SUPERADMIN"])
  if (auditUser.rows[0]) {
    await pool.query(
      'INSERT INTO "AuditLog" ("id", "userId", "userName", "action", "details") VALUES ($1, $2, $3, $4, $5)',
      [crypto.randomUUID(), auditUser.rows[0].id, auditUser.rows[0].name || "System Import", "CUSTOMER_MASTER_IMPORTED", JSON.stringify({ fileName: path.basename(sourceFile), sheetName: masterSource.sheetName, total: rows.length, created, updated, needsReview, initiatedBy: "controlled-script" })],
    )
  }
  const totalAfter = Number((await pool.query('SELECT COUNT(*)::int AS count FROM "Customer"')).rows[0].count)
  console.log(JSON.stringify({ sheetName: masterSource.sheetName, total: rows.length, created, updated, needsReview, existingBefore, totalAfter }))
}

main()
  .catch(error => { console.error(error); process.exitCode = 1 })
  .finally(async () => { await pool.end() })
