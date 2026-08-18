import { getAccessInfo, hasAnyModule, type AccessInfo } from "@/lib/access"
import {
  GATEPASS_REQUESTER_MODULES,
  GATEPASS_SECURITY_MODULES,
  GATEPASS_WAREHOUSE_MODULES,
  PALLET_LEDGER_MODULES,
} from "@/lib/warehouse/gatepass-domain"

export type WarehouseOperationCapability = "REQUESTER" | "WAREHOUSE" | "SECURITY" | "PALLET"

const capabilityModules: Record<WarehouseOperationCapability, readonly string[]> = {
  REQUESTER: GATEPASS_REQUESTER_MODULES,
  WAREHOUSE: GATEPASS_WAREHOUSE_MODULES,
  SECURITY: GATEPASS_SECURITY_MODULES,
  PALLET: PALLET_LEDGER_MODULES,
}

export function hasWarehouseOperationCapability(access: AccessInfo, capability: WarehouseOperationCapability) {
  return hasAnyModule(access, [...capabilityModules[capability]])
}

export async function requireWarehouseOperationAccess(capability: WarehouseOperationCapability) {
  const access = await getAccessInfo()
  if (!access || !hasWarehouseOperationCapability(access, capability)) {
    throw new Error("Anda tidak mempunyai kebenaran untuk tindakan ini.")
  }
  return access
}

export async function getWarehouseOperationAccess() {
  const access = await getAccessInfo()
  if (!access) return null
  return {
    access,
    requester: hasWarehouseOperationCapability(access, "REQUESTER"),
    warehouse: hasWarehouseOperationCapability(access, "WAREHOUSE"),
    security: hasWarehouseOperationCapability(access, "SECURITY"),
    pallet: hasWarehouseOperationCapability(access, "PALLET"),
  }
}
