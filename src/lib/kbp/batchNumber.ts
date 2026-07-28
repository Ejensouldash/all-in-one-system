// KBP batch number — pure logic, no DB and no imports from the production/warehouse code.
//
// Format: <MESIN>-<PRODUK>-<HARI><MINGGU><TAHUN>-<SHIFT>
//
//   BM1  -  425  -  05 21 26  -  01
//    |       |      |  |  |       |
//    |       |      |  |  |       +-- Shift: 01 = Pagi (AM), 02 = Malam (PM)
//    |       |      |  |  +---------- Tahun, 2 digit (ISO week-year)
//    |       |      |  +------------- Minggu ISO 8601 (01-53)
//    |       |      +---------------- Hari ISO: Isnin=01 ... Ahad=07
//    |       +----------------------- Kod produk (derived dari mesin)
//    +------------------------------- Kod mesin
//
// Tahun diambil dari ISO *week-year*, bukan calendar year. Contoh: Isnin minggu 1
// tahun 2026 jatuh pada 29 Dis 2025 -- calendar year bagi "25", ISO week-year bagi
// "26" yang mana itulah yang betul untuk batch tersebut.

export type KbpMachine = {
  id: string
  label: string
  productCode: string
  sku: string
  defaultQtyPerBag: number
}

export const KBP_MACHINES: KbpMachine[] = [
  { id: "BM1", label: "BM1 — Blow Moulding 1", productCode: "425", sku: "BOTTLE 425ml", defaultQtyPerBag: 181 },
  { id: "BM2", label: "BM2 — Blow Moulding 2", productCode: "425", sku: "BOTTLE 425ml", defaultQtyPerBag: 181 },
  { id: "BM3", label: "BM3 — Blow Moulding 3", productCode: "800", sku: "BOTTLE 800ml", defaultQtyPerBag: 225 },
  { id: "CM1", label: "CM1 — Cap Moulding 1", productCode: "CAP", sku: "CAP", defaultQtyPerBag: 4000 },
  { id: "CM2", label: "CM2 — Cap Moulding 2", productCode: "CAP", sku: "CAP", defaultQtyPerBag: 4000 },
]

export type KbpShiftId = "01" | "02"

export const KBP_SHIFTS: { id: KbpShiftId; label: string; short: string }[] = [
  { id: "01", label: "Pagi (AM)", short: "AM" },
  { id: "02", label: "Malam (PM)", short: "PM" },
]

export const KBP_DAY_NAMES = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"]

export function getMachine(machineId: string): KbpMachine | undefined {
  return KBP_MACHINES.find(m => m.id === machineId)
}

export function getShiftLabel(shift: string): string {
  return KBP_SHIFTS.find(s => s.id === shift)?.label || shift
}

// Isnin = "01" ... Ahad = "07"
export function getIsoDayCode(d: Date): string {
  const dayNum = d.getDay() || 7
  return String(dayNum).padStart(2, "0")
}

export function getIsoDayName(d: Date): string {
  return KBP_DAY_NAMES[(d.getDay() || 7) - 1]
}

// ISO 8601 week number + week-year (Thursday anchor). Normalised to UTC midnight
// first so the result never shifts with the runtime timezone.
export function getIsoWeek(d: Date): { week: number; weekYear: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { week, weekYear: t.getUTCFullYear() }
}

export type KbpBatchParts = {
  machine: string
  productCode: string
  dayCode: string
  week: number
  weekYear: number
  shift: string
}

export function buildKbpBatchNo(machineId: string, date: Date, shift: KbpShiftId | string): string {
  const machine = getMachine(machineId)
  if (!machine) throw new Error(`Mesin tidak dikenali: ${machineId}`)

  const shiftCode = String(shift).padStart(2, "0")
  if (shiftCode !== "01" && shiftCode !== "02") {
    throw new Error(`Shift tidak sah: ${shift} (hanya 01 atau 02)`)
  }

  const dayCode = getIsoDayCode(date)
  const { week, weekYear } = getIsoWeek(date)
  const weekCode = String(week).padStart(2, "0")
  const yearCode = String(weekYear).slice(-2)

  return `${machine.id}-${machine.productCode}-${dayCode}${weekCode}${yearCode}-${shiftCode}`
}

const BATCH_PATTERN = /^(BM1|BM2|BM3|CM1|CM2)-(425|800|CAP)-(\d{2})(\d{2})(\d{2})-(01|02)$/

export function parseKbpBatchNo(batchNo: string): KbpBatchParts | null {
  const match = BATCH_PATTERN.exec((batchNo || "").trim().toUpperCase())
  if (!match) return null

  return {
    machine: match[1],
    productCode: match[2],
    dayCode: match[3],
    week: Number(match[4]),
    weekYear: 2000 + Number(match[5]),
    shift: match[6],
  }
}

export function isKbpBatchNo(batchNo: string): boolean {
  return parseKbpBatchNo(batchNo) !== null
}

// Reverse of buildKbpBatchNo's date part: ISO week-year + week + day -> the actual
// calendar date. Used to show "batch ni untuk hari apa" from an old record that has
// no productionDate stored.
export function isoWeekToDate(weekYear: number, week: number, dayCode: string): Date {
  const simple = new Date(Date.UTC(weekYear, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay() || 7
  // Move back to the Monday of that ISO week
  simple.setUTCDate(simple.getUTCDate() - dow + 1)
  simple.setUTCDate(simple.getUTCDate() + (Number(dayCode) - 1))
  return new Date(simple.getUTCFullYear(), simple.getUTCMonth(), simple.getUTCDate())
}

// "Minggu 21 / 2026 · Jumaat (05)"
export function formatIsoWeekLabel(d: Date): string {
  const { week, weekYear } = getIsoWeek(d)
  return `Minggu ${String(week).padStart(2, "0")} / ${weekYear} · ${getIsoDayName(d)} (${getIsoDayCode(d)})`
}

// Local-date helpers: <input type="date"> speaks "YYYY-MM-DD" in local time, and
// `new Date("YYYY-MM-DD")` parses as UTC which can slide a day backwards. These two
// keep everything on the local calendar day.
export function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function fromDateInputValue(value: string): Date {
  const [y, m, day] = value.split("-").map(Number)
  return new Date(y, (m || 1) - 1, day || 1)
}

// A production date is a calendar day, not an instant. Prisma writes a JS Date to a
// @db.Date column by taking its UTC date part, so a local-midnight Date in UTC+8
// (2026-07-28T00:00+08:00 = 2026-07-27T16:00Z) lands in the DB as the PREVIOUS day —
// the stored date then contradicts the day code baked into its own batch number.
// Pin it to UTC midnight of the day the operator actually picked.
export function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

// Render a @db.Date value without the viewer's timezone dragging it a day either way.
export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", { timeZone: "UTC" })
}
