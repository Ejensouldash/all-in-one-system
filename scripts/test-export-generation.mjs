import assert from "node:assert/strict"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import ExcelJS from "exceljs"
import { renderToBuffer } from "@react-pdf/renderer"
import { fetchPMAuditData } from "../src/lib/reminders/pm-audit-data.ts"

dotenv.config({ path: ".env", override: true })

let connectionString = process.env.DATABASE_URL || ""
if (connectionString.includes("pooler.supabase.com")) {
  connectionString = connectionString.replace(":5432/", ":6543/")
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true"
  }
}

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  console.log("=== Testing SGMP-03 PM Audit Export Generation ===\n")

  // 1. Fetch Superadmin
  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
  })
  assert.ok(superadmin, "Superadmin exists in DB")
  console.log(`Using Superadmin: ${superadmin.name} (${superadmin.id})`)

  // 2. Fetch Audit Data for 2026-09-08 to 2026-12-31
  console.log("Fetching PM Audit Data...")
  const data = await fetchPMAuditData(
    { userId: superadmin.id, isSuperAdmin: true, name: superadmin.name || undefined },
    { from: "2026-09-08", to: "2026-12-31" }
  )

  console.log(`- Total Tasks: ${data.summary.totalTasks}`)
  console.log(`- Completed: ${data.summary.completedTasks}`)
  console.log(`- Overdue: ${data.summary.overdueTasks}`)
  console.log(`- Pending: ${data.summary.pendingTasks}`)
  console.log(`- Compliance Rate: ${data.summary.complianceRate.toFixed(1)}%`)
  console.log(`- Calendar Matrix Rows: ${data.calendarMatrix.length}`)
  console.log(`- Detailed Records Count: ${data.records.length}`)
  console.log(`- Master Schedules Count: ${data.schedules.length}`)

  assert.equal(data.calendarMatrix.length, 17, "Expected 17 equipment rows in calendar matrix")
  assert.equal(data.schedules.length, 17, "Expected 17 master schedules")
  assert.equal(data.records.length, 50, "Expected 50 materialized records for remainder of 2026")



  // 4. Test Excel Generation
  console.log("\nTesting ExcelJS Multi-tab Generation...")
  const workbook = new ExcelJS.Workbook()
  const ws1 = workbook.addWorksheet("Ringkasan & Matriks")
  ws1.addRow(["BUBBLES O2 SDN. BHD. - SGMP-03 PM AUDIT REPORT"])
  const ws2 = workbook.addWorksheet("Log Rekod Pemeriksaan")
  ws2.addRow(["No", "Tarikh Patut", "Peralatan", "Status"])
  data.records.forEach((r) => {
    ws2.addRow([r.index, r.dueDate, r.equipment, r.status])
  })
  const ws3 = workbook.addWorksheet("Jadual Induk Peralatan")
  data.schedules.forEach((s) => {
    ws3.addRow([s.equipment, s.frequency, s.startDate])
  })

  const excelBuffer = await workbook.xlsx.writeBuffer()
  assert.ok(excelBuffer.byteLength > 2000, "Excel generated successfully")
  console.log(`PASS: Excel generation succeeded (${(excelBuffer.byteLength / 1024).toFixed(1)} KB)`)

  console.log("\n=== ALL EXPORT TESTS PASSED SUCCESSFULLY! ===")
}

run()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error("FAIL:", e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
