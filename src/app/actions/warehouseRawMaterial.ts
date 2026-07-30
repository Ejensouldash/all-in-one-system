"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logUserAction } from "./audit"
import {
  loadCarryForwardPrefill,
  saveRawMaterialReport,
  updateRawMaterialReport as updateReport,
  voidRawMaterialReport as voidReport,
  getEditability,
  deleteReportAndLinkedDo,
  RawMaterialError,
  type RawMaterialReportInput,
} from "@/lib/warehouse/rawMaterialService"

/**
 * Daily Raw Material (Warehouse) — form SGMP/15/DRM (W).
 *
 * Thin auth wrapper; all logic lives in @/lib/warehouse/rawMaterialService so it can be verified
 * directly. No production module is modified by this feature — the link into the Daily Production
 * Report happens purely by writing a TransferIn document, which the untouched getActiveInventory
 * then picks up on its own.
 */

function revalidateAll() {
  revalidatePath("/forms/warehouse/reports")
  revalidatePath("/forms/warehouse/reports/raw-material")
  revalidatePath("/forms/production/stock")
  revalidatePath("/forms/production/transfer-in")
  revalidatePath("/forms/production/daily-report", "layout")
}

export async function getCarryForwardPrefill() {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }

  try {
    return { success: true as const, data: await loadCarryForwardPrefill() }
  } catch (error: any) {
    console.error("Failed to load carry forward prefill:", error)
    return { success: false as const, error: error.message }
  }
}

export async function listRawMaterialReports(limit = 60) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }

  try {
    const reports = await prisma.warehouseRawMaterialReport.findMany({
      orderBy: [{ date: "desc" }, { sequence: "desc" }],
      take: limit,
      include: { items: true },
    })
    return { success: true as const, data: reports }
  } catch (error: any) {
    console.error("Failed to list raw material reports:", error)
    return { success: false as const, error: error.message }
  }
}

export async function getRawMaterialReport(id: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }

  try {
    const report = await prisma.warehouseRawMaterialReport.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!report) return { success: false as const, error: "Report tidak dijumpai" }
    return { success: true as const, data: report }
  } catch (error: any) {
    console.error("Failed to load raw material report:", error)
    return { success: false as const, error: error.message }
  }
}

/**
 * Whether this report can still be edited, voided or deleted, and if not, why.
 *
 * A failure here must never look like an ordinary lock. Falling back to "not editable" with an
 * empty reason left the UI showing a locked banner with no explanation at all, which is worse
 * than the lock itself — so both failure paths carry a message that says what actually happened.
 */
export async function getReportEditability(reportId: string) {
  const session = await auth()
  if (!session) {
    return {
      success: false as const,
      error: "Unauthorized",
      editable: false,
      reason: null,
      detail: "Sesi tamat. Sila log masuk semula untuk menyemak status borang.",
      isLatest: false,
      blockedBy: [] as string[],
    }
  }

  try {
    return { success: true as const, ...(await getEditability(reportId)) }
  } catch (error: any) {
    console.error("Failed to check editability:", error)
    return {
      success: false as const,
      error: error.message,
      editable: false,
      reason: null,
      detail:
        `Tidak dapat menyemak status borang: ${error.message}. ` +
        `Butang tindakan disembunyikan sebagai langkah berjaga-jaga. Muat semula halaman; ` +
        `kalau masih berlaku selepas skema dikemas kini, mulakan semula server.`,
      isLatest: false,
      blockedBy: [] as string[],
    }
  }
}

export async function createRawMaterialReport(input: Omit<RawMaterialReportInput, "createdById">) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  const user = session.user as any

  try {
    const created = await saveRawMaterialReport({ ...input, createdById: user?.id || null })

    revalidateAll()
    await logUserAction(
      "Created Daily Raw Material (Warehouse)",
      `Date: ${input.date} ${input.shift} #${created.sequence}, Rows: ${created.items.length}, ` +
        `Linked DO: ${created.linkedDoNumber || "none"}. Payload: ${JSON.stringify(input)}`
    )

    return { success: true as const, data: created }
  } catch (error: any) {
    if (!(error instanceof RawMaterialError)) console.error("Failed to create raw material report:", error)
    return { success: false as const, error: error.message }
  }
}

export async function updateRawMaterialReport(
  id: string,
  input: Omit<RawMaterialReportInput, "date" | "createdById">
) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }

  try {
    const updated = await updateReport(id, input)

    revalidateAll()
    revalidatePath(`/forms/warehouse/reports/raw-material/${id}`)
    await logUserAction(
      "Updated Daily Raw Material (Warehouse)",
      `Report: ${id}, Rows: ${updated.items.length}, Linked DO: ${updated.linkedDoNumber || "none"}. ` +
        `Payload: ${JSON.stringify(input)}`
    )

    return { success: true as const, data: updated }
  } catch (error: any) {
    if (!(error instanceof RawMaterialError)) console.error("Failed to update raw material report:", error)
    return { success: false as const, error: error.message }
  }
}

/** Void keeps the record for the audit trail and removes only the generated DO. */
export async function voidRawMaterialReport(id: string, reason: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  const user = session.user as any

  try {
    const voided = await voidReport(id, reason, user?.id || null)

    revalidateAll()
    revalidatePath(`/forms/warehouse/reports/raw-material/${id}`)
    await logUserAction(
      "Voided Daily Raw Material (Warehouse)",
      `Date: ${voided.date.toISOString().split("T")[0]} #${voided.sequence}, ` +
        `DO dibuang: ${voided.linkedDoNumber || "none"}, Sebab: ${reason}`
    )

    return { success: true as const }
  } catch (error: any) {
    if (!(error instanceof RawMaterialError)) console.error("Failed to void raw material report:", error)
    return { success: false as const, error: error.message }
  }
}

/** Hard delete, for test and demo data. Same gate as edit and void. */
export async function deleteRawMaterialReport(id: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  const user = session.user as any
  if (user?.trueRole !== "SUPERADMIN") return { success: false as const, error: "Hanya SUPERADMIN boleh padam kekal" }

  try {
    const removed = await deleteReportAndLinkedDo(id)

    revalidateAll()
    await logUserAction(
      "Deleted Daily Raw Material (Warehouse)",
      `Date: ${removed.date.toISOString().split("T")[0]} #${removed.sequence}, DO: ${removed.linkedDoNumber || "none"}`
    )

    return { success: true as const }
  } catch (error: any) {
    if (!(error instanceof RawMaterialError)) console.error("Failed to delete raw material report:", error)
    return { success: false as const, error: error.message }
  }
}
