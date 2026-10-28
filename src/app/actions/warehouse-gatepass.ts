"use server"

import type { GatePassStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import {
  createWarehouseGatePass,
  createDistributionOrderFromGatePass,
  linkGatePassToDistributionOrder,
  unlinkGatePassFromDistributionOrder,
  publishOrRegenerateGatePass,
  transitionWarehouseGatePass,
  updateGatePassActuals,
  type CreateGatePassInput,
} from "@/lib/warehouse/gatepass-service"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred."
}

function revalidateGatePass(id?: string) {
  revalidatePath("/forms/warehouse/gatepass")
  if (id) revalidatePath(`/forms/warehouse/gatepass/${id}`)
}

export async function createWarehouseGatePassAction(input: CreateGatePassInput) {
  try {
    const gatePass = await createWarehouseGatePass(input)
    revalidateGatePass(gatePass.id)
    return { success: true as const, data: gatePass }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function publishWarehouseGatePassAction(gatePassId: string) {
  try {
    const links = await publishOrRegenerateGatePass(gatePassId)
    revalidateGatePass(gatePassId)
    return { success: true as const, data: links }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function transitionWarehouseGatePassAction(input: {
  gatePassId: string
  toStatus: GatePassStatus
  actor: "REQUESTER" | "WAREHOUSE" | "SECURITY"
  remarks?: string | null
  observedVehicleNo?: string | null
  observedDriverName?: string | null
}) {
  try {
    await transitionWarehouseGatePass(input)
    revalidateGatePass(input.gatePassId)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function updateWarehouseGatePassActualsAction(input: {
  gatePassId: string
  actualPalletQty: number
  warehouseRemarks?: string | null
  loadingCompleted?: boolean
  items: Array<{ id: string; actualQty: number; varianceReason?: string | null }>
}) {
  try {
    await updateGatePassActuals(input)
    revalidateGatePass(input.gatePassId)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function linkWarehouseGatePassDOAction(input: {
  gatePassId: string
  distributionOrderId: string
  isPrimary?: boolean
}) {
  try {
    await linkGatePassToDistributionOrder(input.gatePassId, input.distributionOrderId, input.isPrimary)
    revalidateGatePass(input.gatePassId)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function unlinkWarehouseGatePassDOAction(input: { gatePassId: string; distributionOrderId: string }) {
  try {
    await unlinkGatePassFromDistributionOrder(input.gatePassId, input.distributionOrderId)
    revalidateGatePass(input.gatePassId)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function createWarehouseGatePassDOAction(input: {
  gatePassId: string
  items: Array<{ sku: string; batchNumber: string; qtySent: number }>
}) {
  try {
    const data = await createDistributionOrderFromGatePass(input)
    revalidateGatePass(input.gatePassId)
    revalidatePath("/forms/warehouse/distribution")
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}
