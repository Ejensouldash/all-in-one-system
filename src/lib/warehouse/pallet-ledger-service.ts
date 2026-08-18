import "server-only"

import type { PalletCustodianKind, PalletMovementType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  normalizeText,
  normalizeVehicleNo,
  operationalDateKey,
  parseOperationalDate,
  positiveWholeNumber,
} from "@/lib/warehouse/gatepass-domain"
import { requireWarehouseOperationAccess } from "@/lib/warehouse/operations-access"

export type PalletTransferLineInput = {
  palletTypeId: string
  quantity: number
  fromCondition?: "USABLE" | "DAMAGED" | "LOST"
  toCondition?: "USABLE" | "DAMAGED" | "LOST"
  remarks?: string | null
}

export type CreatePalletTransferInput = {
  movementType: Exclude<PalletMovementType, "REVERSAL">
  occurredAt: string | Date
  fromCustodianId: string
  toCustodianId: string
  gatePassId?: string | null
  distributionOrderId?: string | null
  transportCompany?: string | null
  driverName?: string | null
  vehicleNo?: string | null
  remarks?: string | null
  evidenceUrl?: string | null
  releasedSignature?: string | null
  receivedByName?: string | null
  receivedSignature?: string | null
  verifiedSignature?: string | null
  lines: PalletTransferLineInput[]
}

const transferDetailInclude = {
  fromCustodian: true,
  toCustodian: true,
  createdBy: { select: { id: true, name: true } },
  postedBy: { select: { id: true, name: true } },
  reversedBy: { select: { id: true, name: true } },
  gatePass: { select: { id: true, gatePassNo: true } },
  distributionOrder: { select: { id: true, doNumber: true } },
  lines: { include: { palletType: true }, orderBy: { palletType: { code: "asc" as const } } },
  movements: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.PalletTransferInclude

function parseDate(value: string | Date) {
  return parseOperationalDate(value, "Tarikh pergerakan pallet")
}

async function nextTransferNo(tx: Prisma.TransactionClient, occurredAt: Date) {
  const dateKey = operationalDateKey(occurredAt)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pallet-transfer:${dateKey}`}))`
  const prefix = `PT-${dateKey}-`
  const latest = await tx.palletTransfer.findFirst({
    where: { transferNo: { startsWith: prefix } },
    orderBy: { transferNo: "desc" },
    select: { transferNo: true },
  })
  const previous = Number(latest?.transferNo.slice(prefix.length) || 0)
  return `${prefix}${String(previous + 1).padStart(4, "0")}`
}

function validateRoute(
  movementType: PalletMovementType,
  fromKind: PalletCustodianKind,
  toKind: PalletCustodianKind,
) {
  const externalKinds = new Set<PalletCustodianKind>(["CUSTOMER", "TRANSPORTER"])
  if (fromKind === toKind && movementType !== "TRANSFER") {
    throw new Error("Custodian asal dan penerima mesti berbeza.")
  }
  if (movementType === "OPENING_BALANCE" && (fromKind !== "SYSTEM_OPENING" || toKind !== "WAREHOUSE_USABLE")) {
    throw new Error("Opening balance mesti bergerak daripada SYSTEM_OPENING ke Warehouse Usable.")
  }
  if (movementType === "ISSUE_OUT" && (fromKind !== "WAREHOUSE_USABLE" || !externalKinds.has(toKind))) {
    throw new Error("Issue out mesti bergerak daripada Warehouse Usable kepada customer atau transporter.")
  }
  if (movementType === "RETURN_IN" && (!externalKinds.has(fromKind) || toKind !== "WAREHOUSE_USABLE")) {
    throw new Error("Return in mesti bergerak daripada customer/transporter ke Warehouse Usable.")
  }
  if (movementType === "DAMAGE_RETURN" && (!externalKinds.has(fromKind) || toKind !== "WAREHOUSE_DAMAGED")) {
    throw new Error("Damage return mesti bergerak daripada customer/transporter ke Warehouse Damaged.")
  }
  if ((movementType === "LOST_WRITE_OFF" || movementType === "ADJUSTMENT_OUT") && toKind !== "WRITTEN_OFF") {
    throw new Error("Write-off atau adjustment out mesti menuju ke WRITTEN_OFF.")
  }
  if (movementType === "ADJUSTMENT_IN" && fromKind !== "SYSTEM_OPENING") {
    throw new Error("Adjustment in mesti bermula daripada SYSTEM_OPENING untuk jejak audit yang jelas.")
  }
}

async function balanceInTransaction(tx: Prisma.TransactionClient, custodianId: string, palletTypeId: string) {
  const [incoming, outgoing] = await Promise.all([
    tx.palletMovement.aggregate({
      where: { toCustodianId: custodianId, palletTypeId },
      _sum: { quantity: true },
    }),
    tx.palletMovement.aggregate({
      where: { fromCustodianId: custodianId, palletTypeId },
      _sum: { quantity: true },
    }),
  ])
  return (incoming._sum.quantity || 0) - (outgoing._sum.quantity || 0)
}

async function assertSourceBalances(
  tx: Prisma.TransactionClient,
  fromCustodian: { id: string; kind: PalletCustodianKind; name: string },
  lines: Array<{ palletTypeId: string; quantity: number; palletType: { code: string } }>,
) {
  if (fromCustodian.kind === "SYSTEM_OPENING") return
  for (const line of [...lines].sort((a, b) => a.palletTypeId.localeCompare(b.palletTypeId))) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pallet-balance:${fromCustodian.id}:${line.palletTypeId}`}))`
    const balance = await balanceInTransaction(tx, fromCustodian.id, line.palletTypeId)
    if (balance < line.quantity) {
      throw new Error(
        `Baki ${line.palletType.code} di ${fromCustodian.name} tidak mencukupi. Baki: ${balance}, diminta: ${line.quantity}.`,
      )
    }
  }
}

export async function listPalletReferenceData() {
  await requireWarehouseOperationAccess("PALLET")
  const [palletTypes, custodians, gatePasses, distributionOrders] = await Promise.all([
    prisma.palletType.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.palletCustodian.findMany({ where: { active: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.warehouseGatePass.findMany({
      where: { status: { notIn: ["COMPLETED", "EXPIRED", "CANCELLED", "REJECTED", "NO_SHOW"] } },
      orderBy: { requestedPickupAt: "desc" },
      take: 100,
      select: { id: true, gatePassNo: true, customerName: true },
    }),
    prisma.distributionOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, doNumber: true, destination: true },
    }),
  ])
  return { palletTypes, custodians, gatePasses, distributionOrders }
}

export async function createPalletCustodian(input: {
  kind: "CUSTOMER" | "TRANSPORTER"
  name: string
  externalReference?: string | null
}) {
  const access = await requireWarehouseOperationAccess("PALLET")
  const name = normalizeText(input.name, 180)
  if (!name) throw new Error("Nama custodian diperlukan.")
  const custodian = await prisma.palletCustodian.upsert({
    where: { kind_name: { kind: input.kind, name } },
    create: {
      kind: input.kind,
      name,
      externalReference: normalizeText(input.externalReference, 120) || null,
    },
    update: {
      active: true,
      externalReference: normalizeText(input.externalReference, 120) || undefined,
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: access.userId,
      userName: access.name || "Pallet Ledger User",
      action: "PALLET_CUSTODIAN_UPSERTED",
      details: JSON.stringify({ custodianId: custodian.id, kind: custodian.kind, name: custodian.name }),
    },
  })
  return custodian
}

export async function createPalletTransfer(input: CreatePalletTransferInput) {
  const access = await requireWarehouseOperationAccess("PALLET")
  const occurredAt = parseDate(input.occurredAt)
  if (input.fromCustodianId === input.toCustodianId) throw new Error("Custodian asal dan penerima mesti berbeza.")
  if (!input.lines.length) throw new Error("Sekurang-kurangnya satu baris pallet diperlukan.")

  const defaultToCondition = input.movementType === "DAMAGE_RETURN"
    ? "DAMAGED"
    : input.movementType === "LOST_WRITE_OFF"
      ? "LOST"
      : "USABLE"
  const normalizedLines = input.lines.map((line, index) => ({
    palletTypeId: normalizeText(line.palletTypeId, 80),
    quantity: positiveWholeNumber(line.quantity, `Kuantiti pallet baris ${index + 1}`),
    fromCondition: line.fromCondition || "USABLE",
    toCondition: line.toCondition || defaultToCondition,
    remarks: normalizeText(line.remarks, 1000) || null,
  })).sort((a, b) => a.palletTypeId.localeCompare(b.palletTypeId))
  if (new Set(normalizedLines.map(line => line.palletTypeId)).size !== normalizedLines.length) {
    throw new Error("Jenis pallet yang sama tidak boleh dimasukkan dua kali.")
  }

  return prisma.$transaction(async tx => {
    const [fromCustodian, toCustodian, palletTypeCount] = await Promise.all([
      tx.palletCustodian.findUnique({ where: { id: input.fromCustodianId } }),
      tx.palletCustodian.findUnique({ where: { id: input.toCustodianId } }),
      tx.palletType.count({ where: { id: { in: normalizedLines.map(line => line.palletTypeId) }, active: true } }),
    ])
    if (!fromCustodian || !toCustodian) throw new Error("Custodian pallet tidak sah.")
    if (palletTypeCount !== normalizedLines.length) throw new Error("Satu atau lebih jenis pallet tidak sah.")
    validateRoute(input.movementType, fromCustodian.kind, toCustodian.kind)

    if (input.gatePassId) {
      const gatePass = await tx.warehouseGatePass.findUnique({ where: { id: input.gatePassId }, select: { id: true } })
      if (!gatePass) throw new Error("Gatepass yang dipilih tidak sah.")
    }
    if (input.distributionOrderId) {
      const order = await tx.distributionOrder.findUnique({ where: { id: input.distributionOrderId }, select: { id: true } })
      if (!order) throw new Error("Distribution Order yang dipilih tidak sah.")
    }
    if (input.gatePassId && input.distributionOrderId) {
      const link = await tx.gatePassDeliveryOrder.findUnique({
        where: {
          gatePassId_distributionOrderId: {
            gatePassId: input.gatePassId,
            distributionOrderId: input.distributionOrderId,
          },
        },
        select: { gatePassId: true },
      })
      if (!link) throw new Error("DO yang dipilih belum dilink kepada Gatepass ini.")
    }

    const transferNo = await nextTransferNo(tx, occurredAt)
    const transfer = await tx.palletTransfer.create({
      data: {
        transferNo,
        movementType: input.movementType,
        occurredAt,
        fromCustodianId: fromCustodian.id,
        toCustodianId: toCustodian.id,
        gatePassId: input.gatePassId || null,
        distributionOrderId: input.distributionOrderId || null,
        transportCompany: normalizeText(input.transportCompany, 180) || null,
        driverName: normalizeText(input.driverName, 120) || null,
        vehicleNo: normalizeVehicleNo(input.vehicleNo) || null,
        remarks: normalizeText(input.remarks, 4000) || null,
        evidenceUrl: normalizeText(input.evidenceUrl, 1000) || null,
        releasedSignature: normalizeText(input.releasedSignature, 200000) || null,
        receivedByName: normalizeText(input.receivedByName, 120) || null,
        receivedSignature: normalizeText(input.receivedSignature, 200000) || null,
        verifiedSignature: normalizeText(input.verifiedSignature, 200000) || null,
        createdById: access.userId,
        verifiedById: input.verifiedSignature ? access.userId : null,
        lines: { create: normalizedLines },
      },
      include: transferDetailInclude,
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Pallet Ledger User",
        action: "PALLET_TRANSFER_DRAFT_CREATED",
        details: JSON.stringify({ transferId: transfer.id, transferNo, movementType: transfer.movementType }),
      },
    })
    return transfer
  })
}

export async function postPalletTransfer(transferId: string) {
  const access = await requireWarehouseOperationAccess("PALLET")
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pallet-transfer-post:${transferId}`}))`
    const transfer = await tx.palletTransfer.findUnique({
      where: { id: transferId },
      include: {
        fromCustodian: true,
        toCustodian: true,
        lines: { include: { palletType: true } },
      },
    })
    if (!transfer) throw new Error("Pallet Transfer tidak ditemui.")
    if (transfer.status === "POSTED") return transfer
    if (transfer.status !== "DRAFT") throw new Error("Hanya draft boleh dipost.")
    validateRoute(transfer.movementType, transfer.fromCustodian.kind, transfer.toCustodian.kind)
    await assertSourceBalances(tx, transfer.fromCustodian, transfer.lines)

    await tx.palletMovement.createMany({
      data: transfer.lines.map(line => ({
        transferId: transfer.id,
        transferLineId: line.id,
        palletTypeId: line.palletTypeId,
        movementType: transfer.movementType,
        fromCustodianId: transfer.fromCustodianId,
        toCustodianId: transfer.toCustodianId,
        quantity: line.quantity,
        createdById: access.userId,
      })),
    })
    const posted = await tx.palletTransfer.update({
      where: { id: transfer.id },
      data: { status: "POSTED", postedAt: new Date(), postedById: access.userId },
      include: transferDetailInclude,
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Pallet Ledger User",
        action: "PALLET_TRANSFER_POSTED",
        details: JSON.stringify({ transferId: transfer.id, transferNo: transfer.transferNo }),
      },
    })
    return posted
  })
}

export async function reversePalletTransfer(transferId: string, reason: string) {
  const access = await requireWarehouseOperationAccess("PALLET")
  const reversalReason = normalizeText(reason, 4000)
  if (!reversalReason) throw new Error("Sebab reversal diperlukan.")

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pallet-transfer-reverse:${transferId}`}))`
    const original = await tx.palletTransfer.findUnique({
      where: { id: transferId },
      include: {
        fromCustodian: true,
        toCustodian: true,
        lines: { include: { palletType: true } },
        movements: true,
      },
    })
    if (!original) throw new Error("Pallet Transfer tidak ditemui.")
    if (original.status !== "POSTED") throw new Error("Hanya transfer POSTED boleh direverse.")
    if (!original.movements.length) throw new Error("Ledger movement asal tidak ditemui.")
    await assertSourceBalances(tx, original.toCustodian, original.lines)

    const now = new Date()
    const reversalNo = await nextTransferNo(tx, now)
    const reversal = await tx.palletTransfer.create({
      data: {
        transferNo: reversalNo,
        status: "POSTED",
        movementType: "REVERSAL",
        occurredAt: now,
        fromCustodianId: original.toCustodianId,
        toCustodianId: original.fromCustodianId,
        gatePassId: original.gatePassId,
        distributionOrderId: original.distributionOrderId,
        remarks: `Reversal of ${original.transferNo}: ${reversalReason}`,
        createdById: access.userId,
        postedById: access.userId,
        postedAt: now,
        lines: {
          create: original.lines.map(line => ({
            palletTypeId: line.palletTypeId,
            quantity: line.quantity,
            fromCondition: line.toCondition,
            toCondition: line.fromCondition,
            remarks: line.remarks,
          })),
        },
      },
      include: { lines: true },
    })
    const reversalLinesByType = new Map(reversal.lines.map(line => [line.palletTypeId, line]))
    await tx.palletMovement.createMany({
      data: original.movements.map(movement => {
        const line = reversalLinesByType.get(movement.palletTypeId)
        if (!line) throw new Error("Baris reversal tidak lengkap.")
        return {
          transferId: reversal.id,
          transferLineId: line.id,
          palletTypeId: movement.palletTypeId,
          movementType: "REVERSAL" as const,
          fromCustodianId: movement.toCustodianId,
          toCustodianId: movement.fromCustodianId,
          quantity: movement.quantity,
          reversesMovementId: movement.id,
          createdById: access.userId,
        }
      }),
    })
    await tx.palletTransfer.update({
      where: { id: original.id },
      data: { status: "REVERSED", reversedAt: now, reversedById: access.userId, reversalReason },
    })
    await tx.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Pallet Ledger User",
        action: "PALLET_TRANSFER_REVERSED",
        details: JSON.stringify({ originalId: original.id, originalNo: original.transferNo, reversalId: reversal.id, reversalNo }),
      },
    })
    return { originalId: original.id, reversalId: reversal.id, reversalNo }
  })
}

export async function listPalletTransfers() {
  await requireWarehouseOperationAccess("PALLET")
  return prisma.palletTransfer.findMany({
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: {
      fromCustodian: true,
      toCustodian: true,
      lines: { include: { palletType: true } },
      gatePass: { select: { gatePassNo: true } },
      distributionOrder: { select: { doNumber: true } },
    },
    take: 500,
  })
}

export async function getPalletTransfer(transferId: string) {
  await requireWarehouseOperationAccess("PALLET")
  return prisma.palletTransfer.findUnique({ where: { id: transferId }, include: transferDetailInclude })
}

export async function getPalletBalances() {
  await requireWarehouseOperationAccess("PALLET")
  const [custodians, palletTypes, incoming, outgoing] = await Promise.all([
    prisma.palletCustodian.findMany({ where: { active: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.palletType.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.palletMovement.groupBy({ by: ["toCustodianId", "palletTypeId"], _sum: { quantity: true } }),
    prisma.palletMovement.groupBy({ by: ["fromCustodianId", "palletTypeId"], _sum: { quantity: true } }),
  ])
  const balanceMap = new Map<string, number>()
  for (const row of incoming) {
    const key = `${row.toCustodianId}:${row.palletTypeId}`
    balanceMap.set(key, (balanceMap.get(key) || 0) + (row._sum.quantity || 0))
  }
  for (const row of outgoing) {
    const key = `${row.fromCustodianId}:${row.palletTypeId}`
    balanceMap.set(key, (balanceMap.get(key) || 0) - (row._sum.quantity || 0))
  }
  return custodians
    .filter(custodian => custodian.kind !== "SYSTEM_OPENING")
    .flatMap(custodian => palletTypes.map(palletType => ({
      custodian,
      palletType,
      balance: balanceMap.get(`${custodian.id}:${palletType.id}`) || 0,
    })))
    .filter(row => row.balance !== 0 || row.custodian.kind.startsWith("WAREHOUSE"))
}
