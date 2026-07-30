"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logUserAction } from "./audit"
import {
  loadCarryForwardPrefill,
  saveRawMaterialReport,
  checkLinkedDoClaimed,
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

export async function isLinkedDoClaimed(reportId: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized", claimed: false, by: [] as string[] }

  try {
    const result = await checkLinkedDoClaimed(reportId)
    return { success: true as const, ...result }
  } catch (error: any) {
    console.error("Failed to check linked DO:", error)
    return { success: false as const, error: error.message, claimed: false, by: [] as string[] }
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

export async function deleteRawMaterialReport(id: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  const user = session.user as any
  if (user?.trueRole !== "SUPERADMIN") return { success: false as const, error: "Hanya SUPERADMIN boleh padam" }

  try {
    const claim = await checkLinkedDoClaimed(id)
    if (claim.claimed) {
      return {
        success: false as const,
        error: `DO borang ini sudah digunakan oleh Daily Production Report (${claim.by.join("; ")}). Padam rekod itu dahulu.`,
      }
    }

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
