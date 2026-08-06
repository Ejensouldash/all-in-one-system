"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { logUserAction } from "./audit"
import {
  getLiveWarehouseStock,
  createWithdrawal,
  voidWithdrawal as voidIt,
  getWithdrawalVoidability,
  listWithdrawals,
  malaysiaToday,
  BACKDATE_MODULE,
  WithdrawalError,
  type WithdrawalInput,
} from "@/lib/warehouse/withdrawalService"

/**
 * Raw material withdrawal — production takes stock off the warehouse rack.
 *
 * Thin auth wrapper; the logic lives in @/lib/warehouse/withdrawalService so it can be verified
 * directly. No production module is touched: the link into the Daily Production Report happens by
 * writing a TransferIn document, which the untouched getActiveInventory picks up on its own.
 */

const ALLOWED = ["WAREHOUSE", "RAW_MATERIAL_WITHDRAWAL"]

async function guard() {
  const access = await getAccessInfo()
  if (!access) return { ok: false as const, error: "Unauthorized" }
  if (!hasAnyModule(access, ALLOWED)) return { ok: false as const, error: "Tiada kebenaran untuk merekod pengeluaran" }
  return { ok: true as const, access }
}

function revalidateAll() {
  revalidatePath("/forms/warehouse/reports/raw-material")
  revalidatePath("/forms/warehouse/reports/raw-material/withdraw")
  revalidatePath("/forms/production/stock")
  revalidatePath("/forms/production/transfer-in")
  revalidatePath("/forms/production/daily-report", "layout")
}

export async function getWarehouseLiveStock() {
  const g = await guard()
  if (!g.ok) return { success: false as const, error: g.error, data: [] }

  try {
    return { success: true as const, data: await getLiveWarehouseStock() }
  } catch (error: any) {
    console.error("Failed to load live warehouse stock:", error)
    return { success: false as const, error: error.message, data: [] }
  }
}

export async function recordWithdrawal(input: Omit<WithdrawalInput, "createdById" | "allowBackdate">) {
  const g = await guard()
  if (!g.ok) return { success: false as const, error: g.error }

  try {
    const created = await createWithdrawal({
      ...input,
      allowBackdate: hasAnyModule(g.access, [BACKDATE_MODULE]),
      createdById: g.access.userId,
    })

    revalidateAll()
    // Since 683d70f the DO is stamped with the date the material actually left the rack, not the
    // day the record was keyed in. The log has to name the same date the DO carries.
    const lateNote = created.backdateReason
      ? `REKOD LEWAT (dipos ${input.date} ${input.shift}, direkod ${malaysiaToday()}): ${created.backdateReason} · `
      : ""
    await logUserAction(
      "Recorded Raw Material Withdrawal",
      `${created.withdrawalNo} · ${input.date} ${input.shift} · ${input.purpose} · ${lateNote}` +
        `Taken by: ${input.takenBy} · Lines: ${created.items.length} · ` +
        `DO: ${created.linkedDoNumber || "none"} · Payload: ${JSON.stringify(input)}`
    )

    return { success: true as const, data: created }
  } catch (error: any) {
    if (!(error instanceof WithdrawalError)) console.error("Failed to record withdrawal:", error)
    return { success: false as const, error: error.message }
  }
}

export async function getWithdrawalHistory() {
  const g = await guard()
  if (!g.ok) return { success: false as const, error: g.error, data: [] }

  try {
    return { success: true as const, data: await listWithdrawals() }
  } catch (error: any) {
    console.error("Failed to list withdrawals:", error)
    return { success: false as const, error: error.message, data: [] }
  }
}

export async function checkWithdrawalVoidable(id: string) {
  const g = await guard()
  if (!g.ok) {
    return { success: false as const, error: g.error, voidable: false, reason: null, detail: g.error, blockedBy: [] as string[] }
  }

  try {
    return { success: true as const, ...(await getWithdrawalVoidability(id)) }
  } catch (error: any) {
    console.error("Failed to check withdrawal voidability:", error)
    return {
      success: false as const,
      error: error.message,
      voidable: false,
      reason: null,
      detail: `Tidak dapat menyemak status pengeluaran: ${error.message}. Muat semula halaman.`,
      blockedBy: [] as string[],
    }
  }
}

export async function voidWithdrawal(id: string, reason: string) {
  const g = await guard()
  if (!g.ok) return { success: false as const, error: g.error }

  try {
    const voided = await voidIt(id, reason, g.access.userId)

    revalidateAll()
    await logUserAction(
      "Voided Raw Material Withdrawal",
      `${voided.withdrawalNo} · DO dibuang: ${voided.linkedDoNumber || "none"} · Sebab: ${reason}`
    )

    return { success: true as const }
  } catch (error: any) {
    if (!(error instanceof WithdrawalError)) console.error("Failed to void withdrawal:", error)
    return { success: false as const, error: error.message }
  }
}
