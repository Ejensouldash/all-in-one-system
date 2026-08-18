import "server-only"

import type { GatePassStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  actorCanSetStatus,
  actorType,
  assertGatePassTransition,
  createOpaqueToken,
  hashOpaqueToken,
  normalizeText,
  normalizeVehicleNo,
  operationalDateKey,
  parseOperationalDate,
  positiveWholeNumber,
  publicActorLabel,
  tokenExpiry,
} from "@/lib/warehouse/gatepass-domain"
import { requireWarehouseOperationAccess } from "@/lib/warehouse/operations-access"

type GatePassItemInput = {
  sku?: string | null
  description: string
  uom?: string
  plannedQty: number
}

export type CreateGatePassInput = {
  purpose: string
  requestedPickupAt: string | Date
  pickupLocation: string
  destination: string
  customerName: string
  customerContactName?: string | null
  customerContactEmail?: string | null
  customerContactPhone?: string | null
  customerReference?: string | null
  plannedPalletQty?: number
  internalRemarks?: string | null
  items: GatePassItemInput[]
}

export type ExternalGatePassSubmission = {
  transportCompany: string
  driverName: string
  driverPhone: string
  vehicleNo: string
  vehicleType: string
  confirmedEta: string | Date
  customerRemarks?: string | null
}

export type ExternalRequestMeta = {
  ipAddress?: string | null
  userAgent?: string | null
}

const gatePassDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  statusEvents: {
    orderBy: { occurredAt: "asc" as const },
    include: { actorUser: { select: { id: true, name: true } } },
  },
  deliveryOrders: {
    orderBy: [{ isPrimary: "desc" as const }, { linkedAt: "asc" as const }],
    include: {
      distributionOrder: {
        select: { id: true, doNumber: true, destination: true, distributionDate: true, status: true },
      },
      linkedBy: { select: { id: true, name: true } },
    },
  },
  palletTransfers: {
    orderBy: { createdAt: "desc" as const },
    select: { id: true, transferNo: true, status: true, movementType: true, occurredAt: true },
  },
  verificationTokens: {
    where: { revokedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { publicCode: true },
  },
} satisfies Prisma.WarehouseGatePassInclude

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  if (configured) return configured
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

function validateDate(value: string | Date, label: string) {
  return parseOperationalDate(value, label)
}

function validateItems(items: GatePassItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Sekurang-kurangnya satu item diperlukan.")
  return items.map((item, index) => ({
    sku: normalizeText(item.sku, 80) || null,
    description: normalizeText(item.description, 240),
    uom: normalizeText(item.uom || "BOX", 20).toUpperCase(),
    plannedQty: positiveWholeNumber(item.plannedQty, `Kuantiti item ${index + 1}`),
    sortOrder: index,
  })).map((item, index) => {
    if (!item.description) throw new Error(`Penerangan item ${index + 1} diperlukan.`)
    return item
  })
}

async function nextGatePassNo(tx: Prisma.TransactionClient, requestedPickupAt: Date) {
  const dateKey = operationalDateKey(requestedPickupAt)
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`warehouse-gatepass:${dateKey}`}))`
  const prefix = `GP-${dateKey}-`
  const latest = await tx.warehouseGatePass.findFirst({
    where: { gatePassNo: { startsWith: prefix } },
    orderBy: { gatePassNo: "desc" },
    select: { gatePassNo: true },
  })
  const previous = Number(latest?.gatePassNo.slice(prefix.length) || 0)
  return `${prefix}${String(previous + 1).padStart(4, "0")}`
}

export async function createWarehouseGatePass(input: CreateGatePassInput) {
  const access = await requireWarehouseOperationAccess("REQUESTER")
  const requestedPickupAt = validateDate(input.requestedPickupAt, "Tarikh/masa pengambilan")
  const purpose = normalizeText(input.purpose, 160)
  const pickupLocation = normalizeText(input.pickupLocation, 160)
  const destination = normalizeText(input.destination, 240)
  const customerName = normalizeText(input.customerName, 200)
  if (!purpose || !pickupLocation || !destination || !customerName) {
    throw new Error("Purpose, pickup location, destination dan customer diperlukan.")
  }
  const items = validateItems(input.items)
  const plannedPalletQty = positiveWholeNumber(input.plannedPalletQty ?? 0, "Planned pallet", true)

  const gatePass = await prisma.$transaction(async tx => {
    const gatePassNo = await nextGatePassNo(tx, requestedPickupAt)
    const created = await tx.warehouseGatePass.create({
      data: {
        gatePassNo,
        purpose,
        requestedPickupAt,
        pickupLocation,
        destination,
        customerName,
        customerContactName: normalizeText(input.customerContactName, 120) || null,
        customerContactEmail: normalizeText(input.customerContactEmail, 160).toLowerCase() || null,
        customerContactPhone: normalizeText(input.customerContactPhone, 50) || null,
        customerReference: normalizeText(input.customerReference, 120) || null,
        plannedPalletQty,
        internalRemarks: normalizeText(input.internalRemarks, 4000) || null,
        createdById: access.userId,
        items: { create: items },
      },
      select: { id: true, gatePassNo: true },
    })
    await tx.gatePassStatusEvent.create({
      data: {
        gatePassId: created.id,
        toStatus: "DRAFT",
        actorType: "INTERNAL_USER",
        actorUserId: access.userId,
        actorLabel: access.name,
        remarks: "Gatepass request created.",
      },
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Gatepass Requester",
        action: "WAREHOUSE_GATEPASS_CREATED",
        details: JSON.stringify({ gatePassId: created.id, gatePassNo: created.gatePassNo }),
      },
    })
    return created
  })

  return gatePass
}

export async function publishOrRegenerateGatePass(gatePassId: string) {
  const access = await requireWarehouseOperationAccess("REQUESTER")
  const externalToken = createOpaqueToken()
  const verificationCode = createOpaqueToken()

  const result = await prisma.$transaction(async tx => {
    const gatePass = await tx.warehouseGatePass.findUnique({ where: { id: gatePassId } })
    if (!gatePass) throw new Error("Gatepass tidak ditemui.")
    if (!(["DRAFT", "AWAITING_CUSTOMER", "CUSTOMER_SUBMITTED"] as GatePassStatus[]).includes(gatePass.status)) {
      throw new Error("Customer link tidak boleh dijana pada status semasa.")
    }

    await tx.gatePassExternalToken.updateMany({
      where: { gatePassId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    const existingVerification = await tx.gatePassVerificationToken.findFirst({
      where: { gatePassId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    })
    const activeVerificationCode = existingVerification?.publicCode || verificationCode
    if (!existingVerification) {
      await tx.gatePassVerificationToken.create({ data: { gatePassId, publicCode: activeVerificationCode } })
    }

    await tx.gatePassExternalToken.create({
      data: {
        gatePassId,
        tokenHash: hashOpaqueToken(externalToken),
        expiresAt: tokenExpiry(gatePass.requestedPickupAt),
      },
    })

    const fromStatus = gatePass.status
    await tx.warehouseGatePass.update({
      where: { id: gatePassId },
      data: {
        status: "AWAITING_CUSTOMER",
        customerSubmittedAt: fromStatus === "CUSTOMER_SUBMITTED" ? null : gatePass.customerSubmittedAt,
      },
    })
    await tx.gatePassStatusEvent.create({
      data: {
        gatePassId,
        fromStatus,
        toStatus: "AWAITING_CUSTOMER",
        actorType: "INTERNAL_USER",
        actorUserId: access.userId,
        actorLabel: access.name,
        remarks: fromStatus === "DRAFT" ? "Customer link published." : "Customer link regenerated; previous link revoked.",
      },
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Gatepass Requester",
        action: "WAREHOUSE_GATEPASS_LINK_ISSUED",
        details: JSON.stringify({ gatePassId, gatePassNo: gatePass.gatePassNo, regenerated: fromStatus !== "DRAFT" }),
      },
    })
    return { gatePassNo: gatePass.gatePassNo, verificationCode: activeVerificationCode }
  })

  const baseUrl = appBaseUrl()
  return {
    ...result,
    customerUrl: `${baseUrl}/public/gatepass/${externalToken}`,
    verificationUrl: `${baseUrl}/public/gatepass/verify/${result.verificationCode}`,
  }
}

export async function getExternalGatePass(rawToken: string) {
  const token = await prisma.gatePassExternalToken.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: {
      gatePass: {
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  })
  if (!token || token.revokedAt || token.expiresAt.getTime() < Date.now()) return null
  const gatePass = token.gatePass
  if (!(["AWAITING_CUSTOMER", "CUSTOMER_SUBMITTED"] as GatePassStatus[]).includes(gatePass.status)) return null
  return {
    alreadySubmitted: Boolean(token.submittedAt) || gatePass.status === "CUSTOMER_SUBMITTED",
    expiresAt: token.expiresAt,
    gatePass: {
      gatePassNo: gatePass.gatePassNo,
      purpose: gatePass.purpose,
      requestedPickupAt: gatePass.requestedPickupAt,
      pickupLocation: gatePass.pickupLocation,
      destination: gatePass.destination,
      customerName: gatePass.customerName,
      customerReference: gatePass.customerReference,
      plannedPalletQty: gatePass.plannedPalletQty,
      transportCompany: gatePass.transportCompany,
      driverName: gatePass.driverName,
      driverPhone: gatePass.driverPhone,
      vehicleNo: gatePass.vehicleNo,
      vehicleType: gatePass.vehicleType,
      confirmedEta: gatePass.confirmedEta,
      customerRemarks: gatePass.customerRemarks,
      items: gatePass.items.map(item => ({
        id: item.id,
        sku: item.sku,
        description: item.description,
        uom: item.uom,
        plannedQty: item.plannedQty,
      })),
    },
  }
}

export async function submitExternalGatePass(rawToken: string, input: ExternalGatePassSubmission, meta: ExternalRequestMeta) {
  const tokenHash = hashOpaqueToken(rawToken)
  const transportCompany = normalizeText(input.transportCompany, 180)
  const driverName = normalizeText(input.driverName, 120)
  const driverPhone = normalizeText(input.driverPhone, 50)
  const vehicleNo = normalizeVehicleNo(input.vehicleNo)
  const vehicleType = normalizeText(input.vehicleType, 80)
  const confirmedEta = validateDate(input.confirmedEta, "ETA")
  if (!transportCompany || !driverName || !driverPhone || !vehicleNo || !vehicleType) {
    throw new Error("Semua butiran transporter, driver dan kenderaan diperlukan.")
  }

  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`gatepass-external-submit:${tokenHash}`}))`
    const token = await tx.gatePassExternalToken.findUnique({
      where: { tokenHash },
      include: { gatePass: true },
    })
    if (!token || token.revokedAt || token.expiresAt.getTime() < Date.now()) {
      throw new Error("Pautan tidak sah atau telah tamat tempoh.")
    }
    if (token.submittedAt) return { gatePassNo: token.gatePass.gatePassNo, alreadySubmitted: true }
    if (token.gatePass.status !== "AWAITING_CUSTOMER") {
      throw new Error("Pautan tidak sah atau telah tamat tempoh.")
    }

    const now = new Date()
    await tx.warehouseGatePass.update({
      where: { id: token.gatePassId },
      data: {
        status: "CUSTOMER_SUBMITTED",
        transportCompany,
        driverName,
        driverPhone,
        vehicleNo,
        vehicleType,
        confirmedEta,
        customerRemarks: normalizeText(input.customerRemarks, 4000) || null,
        customerSubmittedAt: now,
      },
    })
    await tx.gatePassExternalToken.update({ where: { id: token.id }, data: { submittedAt: now } })
    const actorLabel = publicActorLabel(driverName)
    await tx.gatePassStatusEvent.create({
      data: {
        gatePassId: token.gatePassId,
        fromStatus: "AWAITING_CUSTOMER",
        toStatus: "CUSTOMER_SUBMITTED",
        actorType: "EXTERNAL_CUSTOMER",
        actorLabel,
        remarks: "External customer submitted transport details.",
        ipAddress: normalizeText(meta.ipAddress, 100) || null,
        userAgent: normalizeText(meta.userAgent, 1000) || null,
      },
    })
    await tx.auditLog.create({
      data: {
        userName: actorLabel,
        action: "WAREHOUSE_GATEPASS_CUSTOMER_SUBMITTED",
        details: JSON.stringify({ gatePassId: token.gatePassId, gatePassNo: token.gatePass.gatePassNo }),
      },
    })
    return { gatePassNo: token.gatePass.gatePassNo, alreadySubmitted: false }
  })
}

export async function getVerificationGatePass(publicCode: string) {
  const token = await prisma.gatePassVerificationToken.findUnique({
    where: { publicCode },
    include: {
      gatePass: { select: { id: true, gatePassNo: true, status: true, requestedPickupAt: true, vehicleNo: true } },
    },
  })
  if (!token || token.revokedAt) return null
  return token.gatePass
}

export async function listWarehouseGatePasses() {
  await requireWarehouseOperationAccess("REQUESTER")
  return prisma.warehouseGatePass.findMany({
    orderBy: [{ requestedPickupAt: "asc" }, { createdAt: "desc" }],
    include: {
      items: { select: { plannedQty: true, actualQty: true } },
      deliveryOrders: { include: { distributionOrder: { select: { doNumber: true } } } },
    },
  })
}

export async function getWarehouseGatePass(gatePassId: string) {
  await requireWarehouseOperationAccess("REQUESTER")
  return prisma.warehouseGatePass.findUnique({ where: { id: gatePassId }, include: gatePassDetailInclude })
}

export async function getSecurityGatePassByCode(publicCode: string) {
  await requireWarehouseOperationAccess("SECURITY")
  const token = await prisma.gatePassVerificationToken.findUnique({
    where: { publicCode },
    include: {
      gatePass: {
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          deliveryOrders: {
            include: { distributionOrder: { select: { id: true, doNumber: true } } },
          },
        },
      },
    },
  })
  if (!token || token.revokedAt) return null
  return token.gatePass
}

function statusTimestampData(toStatus: GatePassStatus, now: Date): Prisma.WarehouseGatePassUpdateInput {
  if (toStatus === "WAREHOUSE_ACKNOWLEDGED") return { warehouseAcknowledgedAt: now }
  if (toStatus === "READY_FOR_PICKUP") return { readyAt: now }
  if (toStatus === "CHECKED_IN") return { checkedInAt: now }
  if (toStatus === "LOADING") return { loadingStartedAt: now }
  if (toStatus === "CHECKED_OUT") return { checkedOutAt: now }
  if (toStatus === "COMPLETED") return { completedAt: now }
  if (toStatus === "CANCELLED") return { cancelledAt: now }
  return {}
}

export async function transitionWarehouseGatePass(input: {
  gatePassId: string
  toStatus: GatePassStatus
  actor: "REQUESTER" | "WAREHOUSE" | "SECURITY"
  remarks?: string | null
  observedVehicleNo?: string | null
  observedDriverName?: string | null
}) {
  const actor = input.actor
  const access = await requireWarehouseOperationAccess(actor === "SECURITY" ? "SECURITY" : actor === "WAREHOUSE" ? "WAREHOUSE" : "REQUESTER")
  if (!actorCanSetStatus(actor, input.toStatus)) throw new Error("Peranan anda tidak dibenarkan menetapkan status ini.")

  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`warehouse-gatepass-transition:${input.gatePassId}`}))`
    const gatePass = await tx.warehouseGatePass.findUnique({
      where: { id: input.gatePassId },
      include: {
        deliveryOrders: { select: { distributionOrderId: true } },
        palletTransfers: { where: { status: "POSTED", movementType: "ISSUE_OUT" }, select: { id: true } },
      },
    })
    if (!gatePass) throw new Error("Gatepass tidak ditemui.")
    if (gatePass.status === input.toStatus) return gatePass
    assertGatePassTransition(gatePass.status, input.toStatus)

    const remarks = normalizeText(input.remarks, 4000)
    const updateData: Prisma.WarehouseGatePassUpdateInput = {
      status: input.toStatus,
      ...statusTimestampData(input.toStatus, new Date()),
    }

    if (input.toStatus === "CHECKED_IN") {
      const observedVehicleNo = normalizeVehicleNo(input.observedVehicleNo || gatePass.vehicleNo)
      const observedDriverName = normalizeText(input.observedDriverName || gatePass.driverName, 120)
      if (!observedVehicleNo) throw new Error("Nombor kenderaan semasa check-in diperlukan.")
      if (gatePass.vehicleNo && observedVehicleNo !== normalizeVehicleNo(gatePass.vehicleNo) && !remarks) {
        throw new Error("Sebab perbezaan nombor kenderaan diperlukan.")
      }
      updateData.checkedInVehicleNo = observedVehicleNo
      updateData.checkedInDriverName = observedDriverName || null
      if (remarks) updateData.securityRemarks = remarks
    }

    if (input.toStatus === "CHECKED_OUT") {
      if (!gatePass.checkedInAt) throw new Error("Check-in diperlukan sebelum check-out.")
      if (!gatePass.loadingCompletedAt) throw new Error("Warehouse belum mengesahkan loading selesai.")
      if (!gatePass.deliveryOrders.length) throw new Error("Sekurang-kurangnya satu DO mesti dilink sebelum check-out.")
      if ((gatePass.actualPalletQty || 0) > 0 && !gatePass.palletTransfers.length) {
        throw new Error("Pallet Transfer ISSUE_OUT mesti dipost sebelum check-out.")
      }
      if (remarks) updateData.securityRemarks = remarks
    }

    if (input.toStatus === "CANCELLED") {
      if (!remarks) throw new Error("Sebab pembatalan diperlukan.")
      updateData.cancellationReason = remarks
    }
    if (input.toStatus === "REJECTED") {
      if (!remarks) throw new Error("Sebab penolakan diperlukan.")
      updateData.rejectionReason = remarks
    }
    if (input.toStatus === "NO_SHOW" && !remarks) throw new Error("Catatan no-show diperlukan.")

    const updated = await tx.warehouseGatePass.update({ where: { id: gatePass.id }, data: updateData })
    await tx.gatePassStatusEvent.create({
      data: {
        gatePassId: gatePass.id,
        fromStatus: gatePass.status,
        toStatus: input.toStatus,
        actorType: actorType(actor),
        actorUserId: access.userId,
        actorLabel: access.name,
        remarks: remarks || null,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || `${actor} User`,
        action: "WAREHOUSE_GATEPASS_STATUS_CHANGED",
        details: JSON.stringify({ gatePassId: gatePass.id, gatePassNo: gatePass.gatePassNo, from: gatePass.status, to: input.toStatus }),
      },
    })
    return updated
  })
}

export async function updateGatePassActuals(input: {
  gatePassId: string
  actualPalletQty: number
  warehouseRemarks?: string | null
  loadingCompleted?: boolean
  items: Array<{ id: string; actualQty: number; varianceReason?: string | null }>
}) {
  const access = await requireWarehouseOperationAccess("WAREHOUSE")
  const actualPalletQty = positiveWholeNumber(input.actualPalletQty, "Actual pallet", true)
  return prisma.$transaction(async tx => {
    const gatePass = await tx.warehouseGatePass.findUnique({
      where: { id: input.gatePassId },
      include: { items: true },
    })
    if (!gatePass) throw new Error("Gatepass tidak ditemui.")
    if (!(["CUSTOMER_SUBMITTED", "WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "CHECKED_IN", "LOADING"] as GatePassStatus[]).includes(gatePass.status)) {
      throw new Error("Actual quantity tidak boleh dikemas kini pada status semasa.")
    }
    if (input.loadingCompleted && gatePass.status !== "LOADING") {
      throw new Error("Loading hanya boleh disahkan selesai selepas status LOADING bermula.")
    }
    if (input.items.length !== gatePass.items.length) throw new Error("Semua item Gatepass mesti disahkan.")
    const inputById = new Map(input.items.map(item => [item.id, item]))
    for (const item of gatePass.items) {
      const value = inputById.get(item.id)
      if (!value) throw new Error("Item Gatepass tidak sah.")
      const actualQty = positiveWholeNumber(value.actualQty, `Actual quantity ${item.description}`, true)
      const varianceReason = normalizeText(value.varianceReason, 1000)
      if (actualQty !== item.plannedQty && !varianceReason) {
        throw new Error(`Sebab variance diperlukan untuk ${item.description}.`)
      }
      await tx.warehouseGatePassItem.update({
        where: { id: item.id },
        data: { actualQty, varianceReason: varianceReason || null },
      })
    }
    if (actualPalletQty !== gatePass.plannedPalletQty && !normalizeText(input.warehouseRemarks, 4000)) {
      throw new Error("Warehouse remarks diperlukan apabila actual pallet berbeza daripada planned pallet.")
    }
    const updated = await tx.warehouseGatePass.update({
      where: { id: gatePass.id },
      data: {
        actualPalletQty,
        warehouseRemarks: normalizeText(input.warehouseRemarks, 4000) || null,
        loadingCompletedAt: input.loadingCompleted ? new Date() : gatePass.loadingCompletedAt,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Warehouse User",
        action: "WAREHOUSE_GATEPASS_ACTUALS_UPDATED",
        details: JSON.stringify({ gatePassId: gatePass.id, gatePassNo: gatePass.gatePassNo, loadingCompleted: Boolean(input.loadingCompleted) }),
      },
    })
    return updated
  })
}

export async function linkGatePassToDistributionOrder(gatePassId: string, distributionOrderId: string, isPrimary = true) {
  const access = await requireWarehouseOperationAccess("WAREHOUSE")
  return prisma.$transaction(async tx => {
    const [gatePass, order] = await Promise.all([
      tx.warehouseGatePass.findUnique({ where: { id: gatePassId }, select: { id: true, gatePassNo: true } }),
      tx.distributionOrder.findUnique({ where: { id: distributionOrderId }, select: { id: true, doNumber: true } }),
    ])
    if (!gatePass || !order) throw new Error("Gatepass atau Distribution Order tidak ditemui.")
    if (isPrimary) {
      await tx.gatePassDeliveryOrder.updateMany({ where: { gatePassId }, data: { isPrimary: false } })
    }
    const link = await tx.gatePassDeliveryOrder.upsert({
      where: { gatePassId_distributionOrderId: { gatePassId, distributionOrderId } },
      create: { gatePassId, distributionOrderId, isPrimary, linkedById: access.userId },
      update: { isPrimary, linkedById: access.userId, linkedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Warehouse User",
        action: "WAREHOUSE_GATEPASS_DO_LINKED",
        details: JSON.stringify({ gatePassId, gatePassNo: gatePass.gatePassNo, distributionOrderId, doNumber: order.doNumber }),
      },
    })
    return link
  })
}

export async function listAvailableDistributionOrders() {
  await requireWarehouseOperationAccess("WAREHOUSE")
  return prisma.distributionOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    select: { id: true, doNumber: true, destination: true, distributionDate: true, status: true },
  })
}
