import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  frequencyRule,
  occurrenceDate,
  datesBetween,
  normalizeEquipment,
  validateCompletion,
  canCompletePM,
  pmStatus,
  validDate,
  ruleLabel,
} from "../src/lib/reminders/pm-core.ts"
import { parsePMWorkbook, suggestGroups } from "../src/lib/reminders/pm-import.ts"
import { classifyPMMailError, buildPMDigest } from "../src/lib/reminders/pm-dispatch.ts"

console.log("=== Running SGMP-03 PM Logic Tests ===\n")

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`FAIL: ${name}`)
    console.error(err)
    failed++
  }
}

// 1. 2-week recurrence: 2026-01-03 => 2026-01-17 => 2026-01-31
test("2-week recurrence generates 2026-01-03 => 2026-01-17 => 2026-01-31", () => {
  const rule = { startDate: "2026-01-03", ...frequencyRule("2 weeks") }
  assert.equal(occurrenceDate(rule, 0), "2026-01-03")
  assert.equal(occurrenceDate(rule, 1), "2026-01-17")
  assert.equal(occurrenceDate(rule, 2), "2026-01-31")
  assert.equal(occurrenceDate(rule, 3), "2026-02-14")
})

// 2. Monthly recurrence
test("Monthly recurrence generates exact calendar months", () => {
  const rule = { startDate: "2026-01-15", ...frequencyRule("monthly") }
  assert.equal(occurrenceDate(rule, 0), "2026-01-15")
  assert.equal(occurrenceDate(rule, 1), "2026-02-15")
  assert.equal(occurrenceDate(rule, 2), "2026-03-15")
  assert.equal(occurrenceDate(rule, 12), "2027-01-15")
})

// 3. Month-end clamping
test("Month-end clamping clamps to last day without drifting across months", () => {
  const rule = { startDate: "2026-01-31", ...frequencyRule("monthly") }
  assert.equal(occurrenceDate(rule, 0), "2026-01-31") // Jan has 31
  assert.equal(occurrenceDate(rule, 1), "2026-02-28") // Feb 2026 has 28
  assert.equal(occurrenceDate(rule, 2), "2026-03-31") // Mar has 31
  assert.equal(occurrenceDate(rule, 3), "2026-04-30") // Apr has 30
  assert.equal(occurrenceDate(rule, 4), "2026-05-31") // May has 31
})

// 4. 2/3/6/12 month intervals
test("2, 3, 6, and 12 month interval calculations", () => {
  const r2 = { startDate: "2026-01-08", ...frequencyRule("2 months") }
  assert.equal(occurrenceDate(r2, 0), "2026-01-08")
  assert.equal(occurrenceDate(r2, 1), "2026-03-08")
  assert.equal(occurrenceDate(r2, 2), "2026-05-08")

  const r3 = { startDate: "2026-02-21", ...frequencyRule("3 months") }
  assert.equal(occurrenceDate(r3, 0), "2026-02-21")
  assert.equal(occurrenceDate(r3, 1), "2026-05-21")
  assert.equal(occurrenceDate(r3, 2), "2026-08-21")

  const r6 = { startDate: "2026-02-14", ...frequencyRule("6 months") }
  assert.equal(occurrenceDate(r6, 0), "2026-02-14")
  assert.equal(occurrenceDate(r6, 1), "2026-08-14")
  assert.equal(occurrenceDate(r6, 2), "2027-02-14")

  const r12 = { startDate: "2026-06-16", ...frequencyRule("yearly") }
  assert.equal(occurrenceDate(r12, 0), "2026-06-16")
  assert.equal(occurrenceDate(r12, 1), "2027-06-16")
})

// 5. Date range generation
test("datesBetween generates only dates within range", () => {
  const rule = { startDate: "2026-01-03", ...frequencyRule("2 weeks") }
  const dates = datesBetween(rule, "2026-01-15", "2026-02-15")
  assert.deepEqual(dates, ["2026-01-17", "2026-01-31", "2026-02-14"])

  // Range before start date returns empty
  const empty = datesBetween(rule, "2025-01-01", "2025-12-31")
  assert.deepEqual(empty, [])
})

// 6. Equipment normalization
test("Equipment normalization handles case and spacing variants", () => {
  assert.equal(normalizeEquipment("3in1 Machine"), "3in1 Machine")
  assert.equal(normalizeEquipment("3 in1 Machine"), "3in1 Machine")
  assert.equal(normalizeEquipment("3in1 machine"), "3in1 Machine")
  assert.equal(normalizeEquipment("  3  in1   machine  "), "3in1 Machine")

  assert.equal(normalizeEquipment("Autoscrambler"), "Autoscrambler Machine")
  assert.equal(normalizeEquipment("Autoscrambler Machine"), "Autoscrambler Machine")
  assert.equal(normalizeEquipment("autoscrambler"), "Autoscrambler Machine")

  assert.equal(normalizeEquipment("Air Compressor"), "Air Compressor")
  assert.equal(normalizeEquipment("Robotic Arm Machine"), "Robotic Arm Machine")
})

// 7. Completion validation (OK vs ISSUE)
test("Completion validation succeeds for OK with or without notes", () => {
  assert.doesNotThrow(() => {
    validateCompletion("OK", "", "2026-09-08", "2026-09-08", "2026-01-01")
  })
  assert.doesNotThrow(() => {
    validateCompletion("OK", "Pemeriksaan selesai, tiada isu", "2026-09-08", "2026-09-08", "2026-01-01")
  })
})

// 8. ISSUE requires notes
test("Completion validation throws when result is ISSUE without notes", () => {
  assert.throws(
    () => {
      validateCompletion("ISSUE", "", "2026-09-08", "2026-09-08", "2026-01-01")
    },
    /Catatan diperlukan untuk masalah/
  )
  assert.throws(
    () => {
      validateCompletion("ISSUE", "   ", "2026-09-08", "2026-09-08", "2026-01-01")
    },
    /Catatan diperlukan untuk masalah/
  )
  assert.doesNotThrow(() => {
    validateCompletion("ISSUE", "Bearing berbunyi bising", "2026-09-08", "2026-09-08", "2026-01-01")
  })
})

// 9. Inspection date bounds validation
test("Inspected date must be between activation date and today", () => {
  // Future date should throw
  assert.throws(
    () => {
      validateCompletion("OK", "", "2026-09-09", "2026-09-08", "2026-01-01")
    },
    /Tarikh pemeriksaan mesti antara pengaktifan dan hari ini/
  )
  // Date before activation should throw
  assert.throws(
    () => {
      validateCompletion("OK", "", "2025-12-31", "2026-09-08", "2026-01-01")
    },
    /Tarikh pemeriksaan mesti antara pengaktifan dan hari ini/
  )
})

// 10. PIC authorization
test("canCompletePM allows Superadmin or assigned PIC only", () => {
  const superAdmin = { userId: "user-admin", isSuperAdmin: true }
  const assignedPic = { userId: "user-pic-1", isSuperAdmin: false }
  const otherUser = { userId: "user-stranger", isSuperAdmin: false }

  const taskPics = ["user-pic-1", "user-pic-2"]

  assert.equal(canCompletePM(superAdmin, taskPics), true)
  assert.equal(canCompletePM(assignedPic, taskPics), true)
  assert.equal(canCompletePM(otherUser, taskPics), false)
})

// 11. Completed occurrence remains unchanged after schedule edit logic
test("replaceFuture logic preserves completed occurrences and historical dates", () => {
  // Simulating occurrences table
  const occurrences = [
    { id: "occ-1", scheduleId: "sch-1", dueDate: "2026-09-01", completedAt: new Date("2026-09-01T10:00:00Z"), result: "OK" },
    { id: "occ-2", scheduleId: "sch-1", dueDate: "2026-09-08", completedAt: null, result: null }, // today
    { id: "occ-3", scheduleId: "sch-1", dueDate: "2026-09-15", completedAt: null, result: null }, // future incomplete
    { id: "occ-4", scheduleId: "sch-1", dueDate: "2026-09-22", completedAt: new Date("2026-09-08T09:00:00Z"), result: "OK" }, // future completed early
  ]
  const today = "2026-09-08"

  // Filter matching: dueDate > today AND completedAt == null
  const toDelete = occurrences.filter((o) => o.scheduleId === "sch-1" && o.dueDate > today && o.completedAt === null)
  assert.equal(toDelete.length, 1)
  assert.equal(toDelete[0].id, "occ-3")

  const remaining = occurrences.filter((o) => !toDelete.includes(o))
  assert.equal(remaining.length, 3)
  assert.ok(remaining.some((o) => o.id === "occ-1")) // completed history
  assert.ok(remaining.some((o) => o.id === "occ-2")) // today's task
  assert.ok(remaining.some((o) => o.id === "occ-4")) // future completed early
})

// 12. Import grouping, duplicate prevention, and SRS separation
test("suggestGroups groups rows by equipment, SRS, and frequency, without merging different SRS", () => {
  const rows = [
    { row: 1, date: "2026-01-03", equipment: "Air Compressor", srs: null, frequency: "2 weeks", pic: "Alif", task: "Check Engine Oil & Filter" },
    { row: 2, date: "2026-01-17", equipment: "Air Compressor", srs: null, frequency: "2 weeks", pic: "Alif", task: "Check Engine Oil & Filter" },
    { row: 3, date: "2026-01-11", equipment: "3in1 Machine", srs: "24-24-8", frequency: "2 weeks", pic: "Syafiq", task: "Cleaning Machine" },
    { row: 4, date: "2026-01-25", equipment: "3 in1 Machine", srs: "24-24-8", frequency: "2 weeks", pic: "Syafiq", task: "Cleaning Machine" },
    { row: 5, date: "2026-02-01", equipment: "3in1 Machine", srs: "DIFFERENT-SRS", frequency: "2 weeks", pic: "Syafiq", task: "Cleaning Machine" },
  ]
  const groups = suggestGroups(rows)
  assert.equal(groups.length, 3) // Air Compressor, 3in1 Machine (24-24-8), 3in1 Machine (DIFFERENT-SRS)

  const compressorGroup = groups.find((g) => g.equipment === "Air Compressor")
  assert.ok(compressorGroup)
  assert.equal(compressorGroup.sourceRows.length, 2)

  const srs1 = groups.find((g) => g.srs === "24-24-8")
  assert.ok(srs1)
  assert.equal(srs1.equipment, "3in1 Machine")
  assert.equal(srs1.sourceRows.length, 2)

  const srs2 = groups.find((g) => g.srs === "DIFFERENT-SRS")
  assert.ok(srs2)
  assert.equal(srs2.sourceRows.length, 1)
})

// 13. Parse all 161 Excel source rows from the actual reference file
test("parsePMWorkbook parses exactly 161 rows from SGMP-03 Excel file", async () => {
  const filePath = path.resolve("public/assets/Maintenance Forms/SGMP-03 Preventive Maintenance schedule 2026.xlsx")
  const buffer = fs.readFileSync(filePath)
  const rows = await parsePMWorkbook(buffer)
  assert.equal(rows.length, 161, `Expected 161 rows, got ${rows.length}`)

  // Verify all rows have valid dates
  for (const r of rows) {
    assert.ok(validDate(r.date), `Row ${r.row} has invalid date: ${r.date}`)
    assert.ok(r.equipment.trim().length > 0, `Row ${r.row} has empty equipment`)
    assert.ok(r.frequency.trim().length > 0, `Row ${r.row} has empty frequency`)
    assert.ok(r.task.trim().length > 0, `Row ${r.row} has empty task`)
    assert.ok(r.pic.trim().length > 0, `Row ${r.row} has empty pic`)
  }

  const groups = suggestGroups(rows)
  const totalAccountedRows = groups.reduce((acc, g) => acc + g.sourceRows.length, 0)
  assert.equal(totalAccountedRows, 161, "All 161 rows must be preserved in suggested groups")
})

// 14. PM digest error classification (explicit failure vs uncertain SMTP outcome)
test("classifyPMMailError correctly distinguishes explicit failure from uncertain outcome", () => {
  // Explicit SMTP error codes (e.g. 4xx, 5xx, or network connection errors before/during connect)
  const authErr = classifyPMMailError({ code: "EAUTH" })
  assert.equal(authErr.status, "FAILED")

  const connErr = classifyPMMailError({ code: "ECONNECTION" })
  assert.equal(connErr.status, "FAILED")

  const dnsErr = classifyPMMailError({ code: "EDNS" })
  assert.equal(dnsErr.status, "FAILED")

  const rejectErr = classifyPMMailError({ responseCode: 550 })
  assert.equal(rejectErr.status, "FAILED")

  const tempRejectErr = classifyPMMailError({ responseCode: 421 })
  assert.equal(tempRejectErr.status, "FAILED")

  // Unknown/dropped connection after DATA (uncertain outcome - do not automatically resend)
  const uncertainErr = classifyPMMailError({ code: "ETIMEDOUT" })
  assert.equal(uncertainErr.status, "UNCERTAIN")

  const genericErr = classifyPMMailError({})
  assert.equal(genericErr.status, "UNCERTAIN")
})

// 15. buildPMDigest generates correct HTML and occurrence link
test("buildPMDigest generates proper HTML with occurrence links", () => {
  const tasks = [
    { id: "occ-123", dueDate: "2026-09-08", equipment: "3in1 Machine", srs: "24-24-8", checklist: ["Check Oil", "Clean"] },
    { id: "occ-456", dueDate: "2026-09-09", equipment: "Air Compressor", srs: null, checklist: ["Inspect Filter"] },
  ]
  const html = buildPMDigest(tasks, "2026-09-08", "https://app.test")
  assert.ok(html.includes("3in1 Machine"))
  assert.ok(html.includes("24-24-8"))
  assert.ok(html.includes("Check Oil"))
  assert.ok(html.includes("/reminders?tab=pm&amp;occurrence=occ-123"))
  assert.ok(html.includes("/reminders?tab=pm&amp;occurrence=occ-456"))
})

console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`)
if (failed > 0) {
  process.exit(1)
}
