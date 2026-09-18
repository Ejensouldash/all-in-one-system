"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { logUserAction } from "./audit"
import {
  KBP_MACHINES,
  buildKbpBatchNo,
  getIsoDayCode,
  getIsoWeek,
  getMachine,
  getShiftLabel,
  toUtcDateOnly,
  type KbpShiftId,
} from "@/lib/kbp/batchNumber"

const KBP_MODULES = ["KBP"]

async function requireKbpAccess() {
  const access = await getAccessInfo()
  if (!access) return { ok: false as const, error: "Unauthorized" }
  if (!hasAnyModule(access, KBP_MODULES)) {
    return { ok: false as const, error: "Anda tiada akses ke module KBP." }
  }
  return { ok: true as const, access }
}

// Normalises whatever the client sends into a real local calendar date. The client
// posts "YYYY-MM-DD"; new Date("YYYY-MM-DD") would parse as UTC and can slide back
// a day in UTC+8, which would silently produce the wrong day/week code.
function parseProductionDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function formatMy(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

export async function createKbpBatch(data: {
  machine: string
  productionDate: string
  shift: string
  qtyPerBag: number
  totalBags: number
}) {
  const gate = await requireKbpAccess()
  if (!gate.ok) return { success: false, error: gate.error }

  const machine = getMachine(data.machine)
  if (!machine) {
    return { success: false, error: `Mesin tidak sah: ${data.machine}` }
  }

  const shift = String(data.shift).padStart(2, "0")
  if (shift !== "01" && shift !== "02") {
    return { success: false, error: "Sila pilih shift (01 = Pagi, 02 = Malam)." }
  }

  const productionDate = parseProductionDate(data.productionDate)
  if (!productionDate) {
    return { success: false, error: "Tarikh produksi tidak sah." }
  }

  const qtyPerBag = Number(data.qtyPerBag) || 0
  const totalBags = Number(data.totalBags) || 1
  if (qtyPerBag <= 0) return { success: false, error: "Qty per bag mesti lebih dari 0." }
  if (totalBags <= 0) return { success: false, error: "Total bags mesti lebih dari 0." }

  if (!machine.allowedQtyPerBag.includes(qtyPerBag)) {
    return {
      success: false,
      error: `Qty per bag (${qtyPerBag}) tidak sah untuk ${machine.sku}. Pilihan sah: ${machine.allowedQtyPerBag.join(", ")} pcs.`,
    }
  }

  const batchNo = buildKbpBatchNo(machine.id, productionDate, shift as KbpShiftId)
  const dayCode = getIsoDayCode(productionDate)
  const { week, weekYear } = getIsoWeek(productionDate)

  try {
    const existing = await prisma.pedasBatch.findUnique({ where: { batchNo } })
    if (existing) {
      return {
        success: false,
        error:
          `Batch ${batchNo} dah wujud — mesin ${machine.id} shift ${getShiftLabel(shift)} ` +
          `pada ${formatMy(productionDate)} sudah ada batch. Pilih mesin, tarikh atau shift lain.`,
      }
    }

    const batch = await prisma.pedasBatch.create({
      data: {
        sku: machine.sku,
        batchNo,
        qtyPerBag,
        totalBags,
        totalQty: qtyPerBag * totalBags,
        createdBy: gate.access.name || "Staff KBP",
        machine: machine.id,
        productCode: machine.productCode,
        productionDate: toUtcDateOnly(productionDate),
        dayCode,
        weekNo: week,
        weekYear,
        shift,
      },
    })

    revalidatePath("/kbp")
    revalidatePath("/kbp/batch")

    await logUserAction(
      "Created KBP Batch",
      `Batch: ${batchNo}, Mesin: ${machine.id}, SKU: ${machine.sku}, ` +
        `Shift: ${getShiftLabel(shift)}, Tarikh: ${formatMy(productionDate)}, Total Qty: ${qtyPerBag * totalBags}`
    )

    return { success: true, data: batch }
  } catch (error: any) {
    console.error("Failed to create KBP batch:", error)
    return { success: false, error: error.message }
  }
}

export async function getKbpBatches(take = 50) {
  const gate = await requireKbpAccess()
  if (!gate.ok) return { success: false, error: gate.error, data: [] }

  try {
    const batches = await prisma.pedasBatch.findMany({
      orderBy: { createdAt: "desc" },
      take,
    })
    return { success: true, data: batches }
  } catch (error: any) {
    console.error("Failed to fetch KBP batches:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function deleteKbpBatch(id: string) {
  const gate = await requireKbpAccess()
  if (!gate.ok) return { success: false, error: gate.error }

  try {
    const batch = await prisma.pedasBatch.findUnique({ where: { id } })
    await prisma.pedasBatch.delete({ where: { id } })

    revalidatePath("/kbp")
    revalidatePath("/kbp/batch")

    if (batch) {
      await logUserAction("Deleted KBP Batch", `Batch: ${batch.batchNo}, SKU: ${batch.sku}`)
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export type KbpMachineStat = {
  id: string
  label: string
  productCode: string
  sku: string
  amDone: boolean
  pmDone: boolean
  weekBatches: number
  weekQty: number
}

export type KbpDashboardStats = {
  todayBatches: number
  todayQty: number
  weekBatches: number
  weekQty: number
  machinesActiveToday: number
  machines: KbpMachineStat[]
  recent: any[]
  legacyCount: number
}

// Read-only aggregation for the KBP dashboard. Scoped to the current ISO week so
// "minggu ni" on the dashboard matches the week code baked into the batch numbers.
export async function getKbpDashboardStats(): Promise<
  { success: true; data: KbpDashboardStats } | { success: false; error: string }
> {
  const gate = await requireKbpAccess()
  if (!gate.ok) return { success: false, error: gate.error }

  try {
    const now = new Date()
    const { week, weekYear } = getIsoWeek(now)
    // Match the UTC-midnight convention productionDate is stored with.
    const todayStart = toUtcDateOnly(now)
    const todayEnd = new Date(todayStart.getTime() + 86400000)

    const [weekRows, todayRows, recent, legacyCount] = await Promise.all([
      prisma.pedasBatch.findMany({
        where: { weekNo: week, weekYear },
        select: { machine: true, shift: true, totalQty: true },
      }),
      prisma.pedasBatch.findMany({
        where: { productionDate: { gte: todayStart, lt: todayEnd } },
        select: { machine: true, shift: true, totalQty: true },
      }),
      prisma.pedasBatch.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.pedasBatch.count({ where: { machine: null } }),
    ])

    const machines: KbpMachineStat[] = KBP_MACHINES.map(m => {
      const weekForMachine = weekRows.filter(r => r.machine === m.id)
      const todayForMachine = todayRows.filter(r => r.machine === m.id)
      return {
        id: m.id,
        label: m.label,
        productCode: m.productCode,
        sku: m.sku,
        amDone: todayForMachine.some(r => r.shift === "01"),
        pmDone: todayForMachine.some(r => r.shift === "02"),
        weekBatches: weekForMachine.length,
        weekQty: weekForMachine.reduce((sum, r) => sum + (r.totalQty || 0), 0),
      }
    })

    return {
      success: true,
      data: {
        todayBatches: todayRows.length,
        todayQty: todayRows.reduce((sum, r) => sum + (r.totalQty || 0), 0),
        weekBatches: weekRows.length,
        weekQty: weekRows.reduce((sum, r) => sum + (r.totalQty || 0), 0),
        machinesActiveToday: new Set(todayRows.map(r => r.machine).filter(Boolean)).size,
        machines,
        recent,
        legacyCount,
      },
    }
  } catch (error: any) {
    console.error("Failed to build KBP dashboard stats:", error)
    return { success: false, error: error.message }
  }
}
