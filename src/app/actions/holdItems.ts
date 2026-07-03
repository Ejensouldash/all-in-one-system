"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"

export async function getHoldItems() {
  try {
    const items = await prisma.productionHoldItem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        report: { select: { date: true, shift: true, line: true } }
      }
    })
    return { success: true, data: items }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function resolveHoldItem(id: string, resolutionType: string, reason?: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const hold = await prisma.productionHoldItem.findUnique({ where: { id } })
    if (!hold) return { success: false, error: "Hold item not found" }
    if (hold.status !== "PENDING") return { success: false, error: "Already resolved" }

    await prisma.$transaction(async (tx) => {
      // 1. Update Hold Item status
      await tx.productionHoldItem.update({
        where: { id },
        data: {
          status: resolutionType,
          resolvedAt: new Date()
        }
      })

      // 2. Perform action based on resolution type
      if (resolutionType === "REUSE") {
        // Return to carry forward logic (act like a source)
        await tx.inventoryLog.create({
          data: {
            reportId: hold.reportId,
            sectionKey: hold.sectionKey,
            type: "Reuse",
            batchNo: hold.batchNo,
            bags: hold.qty,
            mult: hold.mult
          }
        })
      } else if (resolutionType === "REJECT_BEFORE" || resolutionType === "REJECT_AFTER") {
        // Create Reject Log
        await tx.rejectLog.create({
          data: {
            reportId: hold.reportId,
            item: hold.sectionKey,
            before: resolutionType === "REJECT_BEFORE" ? (hold.qty * hold.mult) : 0,
            after: resolutionType === "REJECT_AFTER" ? (hold.qty * hold.mult) : 0,
            type: "SCRAP"
          }
        })
      }
      // For "RETURN", we do nothing to inventory, just leave it marked as RETURN.
    })

    revalidatePath("/forms")
    
    await logUserAction(
      "Resolved Production Hold",
      `Hold ID: ${id}, Resolved as: ${resolutionType}` + (reason ? ` Reason: ${reason}` : "")
    )

    return { success: true }
  } catch (error: any) {
    console.error("Failed to resolve hold item:", error)
    return { success: false, error: error.message }
  }
}
