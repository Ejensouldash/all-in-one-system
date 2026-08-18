import { createHash, randomBytes } from "node:crypto"
import type { GatePassActorType, GatePassStatus } from "@prisma/client"

export const GATEPASS_REQUESTER_MODULES = ["GATEPASS_REQUESTER", "WAREHOUSE_GATEPASS", "WAREHOUSE"] as const
export const GATEPASS_WAREHOUSE_MODULES = ["WAREHOUSE_GATEPASS", "WAREHOUSE"] as const
export const GATEPASS_SECURITY_MODULES = ["SECURITY_GATEPASS"] as const
export const PALLET_LEDGER_MODULES = ["PALLET_LEDGER", "WAREHOUSE"] as const

const terminalStatuses = new Set<GatePassStatus>([
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
])

const transitions: Record<GatePassStatus, readonly GatePassStatus[]> = {
  DRAFT: ["AWAITING_CUSTOMER", "CANCELLED"],
  AWAITING_CUSTOMER: ["CUSTOMER_SUBMITTED", "EXPIRED", "CANCELLED"],
  CUSTOMER_SUBMITTED: ["AWAITING_CUSTOMER", "WAREHOUSE_ACKNOWLEDGED", "REJECTED", "CANCELLED"],
  WAREHOUSE_ACKNOWLEDGED: ["PREPARING", "REJECTED", "CANCELLED", "NO_SHOW"],
  PREPARING: ["READY_FOR_PICKUP", "REJECTED", "CANCELLED", "NO_SHOW"],
  READY_FOR_PICKUP: ["CHECKED_IN", "REJECTED", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["LOADING", "REJECTED"],
  LOADING: ["CHECKED_OUT"],
  CHECKED_OUT: ["COMPLETED"],
  COMPLETED: [],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
  NO_SHOW: [],
}

export function canTransitionGatePass(from: GatePassStatus, to: GatePassStatus) {
  return transitions[from].includes(to)
}

export function assertGatePassTransition(from: GatePassStatus, to: GatePassStatus) {
  if (!canTransitionGatePass(from, to)) {
    throw new Error(`Status Gatepass tidak boleh ditukar daripada ${from} kepada ${to}.`)
  }
}

export function isGatePassTerminal(status: GatePassStatus) {
  return terminalStatuses.has(status)
}

export function actorCanSetStatus(actor: "REQUESTER" | "WAREHOUSE" | "SECURITY" | "SYSTEM", to: GatePassStatus) {
  if (actor === "REQUESTER") return to === "AWAITING_CUSTOMER" || to === "CANCELLED"
  if (actor === "SECURITY") return to === "CHECKED_IN" || to === "CHECKED_OUT" || to === "REJECTED"
  if (actor === "SYSTEM") return to === "EXPIRED"
  return [
    "WAREHOUSE_ACKNOWLEDGED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "LOADING",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
    "NO_SHOW",
  ].includes(to)
}

export function actorType(actor: "REQUESTER" | "WAREHOUSE" | "SECURITY" | "SYSTEM"): GatePassActorType {
  return actor === "SYSTEM" ? "SYSTEM" : "INTERNAL_USER"
}

export function normalizeVehicleNo(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
}

export function normalizeText(value: unknown, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength)
}

export function positiveWholeNumber(value: unknown, label: string, allowZero = false) {
  const amount = Number(value)
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1)) {
    throw new Error(`${label} mesti nombor bulat ${allowZero ? "sifar atau lebih" : "lebih daripada sifar"}.`)
  }
  return amount
}

// Browser datetime-local values do not contain a timezone. Warehouse operations are performed in
// Malaysia, while the deployed server may run in UTC, so interpret timezone-less values as UTC+08.
export function parseOperationalDate(value: string | Date, label: string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error(`${label} tidak sah.`)
    return value
  }
  const textValue = normalizeText(value, 80)
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(textValue)
  const parsed = new Date(hasTimezone ? textValue : `${textValue}+08:00`)
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} tidak sah.`)
  return parsed
}

export function operationalDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(row => row.type === type)?.value || ""
  return `${part("year")}${part("month")}${part("day")}`
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url")
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function tokenExpiry(requestedPickupAt: Date) {
  return new Date(requestedPickupAt.getTime() + 24 * 60 * 60 * 1000)
}

export function publicActorLabel(name: string) {
  const normalized = normalizeText(name, 100)
  return normalized || "External customer"
}
