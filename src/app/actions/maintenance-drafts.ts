"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isValidDraftKey } from "@/app/forms/maintenance/_components/formTypes"

export type MaintenanceDraft = {
  formType: string
  payload: unknown
  updatedAt: Date
}

/**
 * Every action here scopes on session.user.id — a draft is private to whoever
 * saved it, and server functions are reachable by direct POST, so the auth
 * check is not optional.
 */
async function requireUserId() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  return userId
}

export async function saveMaintenanceDraft(formType: string, payload: unknown) {
  try {
    const userId = await requireUserId()
    if (!userId) return { success: false, error: "Not signed in." }
    if (!isValidDraftKey(formType)) return { success: false, error: "Unknown form type." }

    const draft = await prisma.maintenanceFormDraft.upsert({
      where: { formType_userId: { formType, userId } },
      update: { payload: payload as object },
      create: { formType, userId, payload: payload as object },
    })

    return { success: true, data: { updatedAt: draft.updatedAt } }
  } catch (error: any) {
    console.error("Error saving MaintenanceFormDraft:", error)
    return { success: false, error: error.message }
  }
}

export async function getMaintenanceDraft(formType: string) {
  try {
    const userId = await requireUserId()
    if (!userId) return { success: false, error: "Not signed in." }
    if (!isValidDraftKey(formType)) return { success: false, error: "Unknown form type." }

    const draft = await prisma.maintenanceFormDraft.findUnique({
      where: { formType_userId: { formType, userId } },
    })

    if (!draft) return { success: true, data: null }
    return {
      success: true,
      data: { formType: draft.formType, payload: draft.payload, updatedAt: draft.updatedAt } as MaintenanceDraft,
    }
  } catch (error: any) {
    console.error("Error fetching MaintenanceFormDraft:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteMaintenanceDraft(formType: string) {
  try {
    const userId = await requireUserId()
    if (!userId) return { success: false, error: "Not signed in." }

    // deleteMany so a missing draft is a no-op rather than a throw
    await prisma.maintenanceFormDraft.deleteMany({ where: { formType, userId } })
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting MaintenanceFormDraft:", error)
    return { success: false, error: error.message }
  }
}

/** Drafts belonging to the current user — powers the "DRAFT" badge on the GMP dashboard. */
export async function listMyMaintenanceDrafts() {
  try {
    const userId = await requireUserId()
    if (!userId) return { success: true, data: [] as { formType: string; updatedAt: Date }[] }

    const drafts = await prisma.maintenanceFormDraft.findMany({
      where: { userId },
      select: { formType: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })

    return { success: true, data: drafts }
  } catch (error: any) {
    console.error("Error listing MaintenanceFormDraft:", error)
    return { success: true, data: [] as { formType: string; updatedAt: Date }[] }
  }
}
