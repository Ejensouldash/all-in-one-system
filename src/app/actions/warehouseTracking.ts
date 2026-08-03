"use server"

import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { revalidatePath } from "next/cache"
import { logUserAction } from "./audit"

const TRACKING_EVENTS = ["DISPATCHED", "ARRIVED", "DELIVERED"] as const
type TrackingEventType = (typeof TRACKING_EVENTS)[number]

export type LocationCheckInInput = {
  distributionOrderId: string
  eventType: TrackingEventType
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
  locationStatus: "CAPTURED" | "DENIED" | "UNAVAILABLE" | "TIMEOUT"
  remarks?: string
}

function isFiniteOrNull(value: number | null | undefined) {
  return value == null || Number.isFinite(value)
}

export async function recordDistributionCheckIn(input: LocationCheckInInput) {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["WAREHOUSE"])) {
    return { success: false, error: "Warehouse access is required." }
  }

  if (!TRACKING_EVENTS.includes(input.eventType)) {
    return { success: false, error: "Invalid tracking milestone." }
  }

  if (!isFiniteOrNull(input.latitude) || !isFiniteOrNull(input.longitude) || !isFiniteOrNull(input.accuracy)) {
    return { success: false, error: "Invalid location coordinates." }
  }

  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
    return { success: false, error: "Latitude is outside the valid range." }
  }
  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
    return { success: false, error: "Longitude is outside the valid range." }
  }

  const remarks = input.remarks?.trim().slice(0, 500) || null

  try {
    const order = await prisma.distributionOrder.findUnique({
      where: { id: input.distributionOrderId },
      select: { id: true, doNumber: true, status: true }
    })

    if (!order) return { success: false, error: "Distribution Order not found." }
    if (order.status === "RETURNED") {
      return { success: false, error: "A returned Distribution Order cannot be checked in." }
    }

    const latest = await prisma.distributionTrackingEvent.findFirst({
      where: { distributionOrderId: order.id },
      orderBy: { recordedAt: "desc" },
      select: { eventType: true }
    })

    if (latest?.eventType === input.eventType) {
      return { success: false, error: "This milestone has already been recorded." }
    }
    if (latest?.eventType === "DELIVERED") {
      return { success: false, error: "This delivery has already been completed." }
    }

    const locationCaptured =
      input.locationStatus === "CAPTURED" &&
      input.latitude != null &&
      input.longitude != null

    const event = await prisma.$transaction(async tx => {
      const created = await tx.distributionTrackingEvent.create({
        data: {
          distributionOrderId: order.id,
          eventType: input.eventType,
          latitude: locationCaptured ? input.latitude : null,
          longitude: locationCaptured ? input.longitude : null,
          accuracy: locationCaptured ? input.accuracy ?? null : null,
          locationStatus: locationCaptured ? "CAPTURED" : input.locationStatus,
          remarks,
          recordedById: access.userId,
        }
      })

      // Delivery status is operational metadata only. Inventory quantities are deliberately untouched.
      if (input.eventType === "DELIVERED" && order.status !== "DELIVERED") {
        await tx.distributionOrder.update({
          where: { id: order.id },
          data: { status: "DELIVERED" }
        })
      }

      return created
    })

    await logUserAction(
      `Distribution ${input.eventType}`,
      `${order.doNumber} checked in by ${access.name || access.userId}; location ${locationCaptured ? "captured" : input.locationStatus.toLowerCase()}.`
    )

    revalidatePath(`/forms/warehouse/trace/do/${order.id}`)
    revalidatePath(`/forms/warehouse/distribution/${order.id}/pod`)
    revalidatePath("/forms/warehouse/distribution")
    revalidatePath("/forms/warehouse/dashboard")

    return { success: true, data: { id: event.id } }
  } catch (error: unknown) {
    console.error("Failed to record distribution check-in:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to record check-in." }
  }
}
