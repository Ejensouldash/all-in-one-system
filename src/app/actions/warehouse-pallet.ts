"use server"

import { revalidatePath } from "next/cache"
import {
  createPalletCustodian,
  createPalletTransfer,
  postPalletTransfer,
  reversePalletTransfer,
  type CreatePalletTransferInput,
} from "@/lib/warehouse/pallet-ledger-service"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ralat tidak dijangka."
}

function revalidatePallet(id?: string) {
  revalidatePath("/forms/maintenance/pallet-transfer")
  if (id) revalidatePath(`/forms/maintenance/pallet-transfer/${id}`)
  revalidatePath("/forms/warehouse/gatepass")
}

export async function createPalletCustodianAction(input: {
  kind: "CUSTOMER" | "TRANSPORTER"
  name: string
  externalReference?: string | null
}) {
  try {
    const custodian = await createPalletCustodian(input)
    revalidatePallet()
    return { success: true as const, data: custodian }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function createPalletTransferAction(input: CreatePalletTransferInput) {
  try {
    const transfer = await createPalletTransfer(input)
    revalidatePallet(transfer.id)
    return { success: true as const, data: { id: transfer.id, transferNo: transfer.transferNo } }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function postPalletTransferAction(transferId: string) {
  try {
    await postPalletTransfer(transferId)
    revalidatePallet(transferId)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}

export async function reversePalletTransferAction(transferId: string, reason: string) {
  try {
    const reversal = await reversePalletTransfer(transferId, reason)
    revalidatePallet(transferId)
    revalidatePallet(reversal.reversalId)
    return { success: true as const, data: reversal }
  } catch (error) {
    return { success: false as const, error: errorMessage(error) }
  }
}
