import { prisma } from "@/lib/prisma"

// Max sellable units the warehouse floor holds. There is no capacity table yet, so this is the
// single place to adjust when racking changes.
export const WAREHOUSE_CAPACITY_UNITS = 200_000

const DAY_MS = 86_400_000
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000
const HISTORY_DAYS = 31

// Calendar day in Malaysia time, e.g. "2026-10-28". Every bucket on the dashboard uses this key.
export function mytDayKey(date: Date) {
  return new Date(date.getTime() + MYT_OFFSET_MS).toISOString().slice(0, 10)
}

function mytStartOfDay(date: Date) {
  return new Date(Date.parse(`${mytDayKey(date)}T00:00:00.000Z`) - MYT_OFFSET_MS)
}

export type DailyFlow = {
  date: string
  inflowUnits: number
  handoversReceived: number
  batchesReceived: number
  outflowUnits: number
  dosDispatched: number
  returnsLogged: number
  gatepassesScheduled: number
  gateCheckouts: number
  turnaroundMinutesTotal: number
  turnaroundSamples: number
}

export type DashboardBatch = {
  batchNumber: string
  sku: string
  available: number
  ageDays: number
}

export type DashboardTransitOrder = {
  id: string
  doNumber: string
  destination: string
  units: number
  daysInTransit: number
}

export type WarehouseDashboardData = {
  today: string
  monthStart: string
  capacityUnits: number
  batches: DashboardBatch[]
  newBatchesByDay: { date: string; count: number }[]
  newBatchesPrevWeek: number
  daily: DailyFlow[]
  pendingHandovers: number
  inTransit: DashboardTransitOrder[]
  quarantine: { count: number; units: number; logged30d: number; resolved30d: number }
  gatepass: { loadingNow: number; activeNow: number }
  doIndex: { id: string; doNumber: string; destination: string; status: string }[]
}

const INACTIVE_GATEPASS = ["CANCELLED", "REJECTED", "EXPIRED", "NO_SHOW", "DRAFT"] as const
const ACTIVE_GATEPASS = ["WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "CHECKED_IN", "LOADING"] as const

export async function getWarehouseDashboardData() {
  const now = new Date()
  const todayStart = mytStartOfDay(now)
  const historyStart = new Date(todayStart.getTime() - (HISTORY_DAYS - 1) * DAY_MS)
  const twoWeeksAgo = new Date(todayStart.getTime() - 13 * DAY_MS)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS)

  const [
    pendingHandovers,
    inventoryBatches,
    recentBatches,
    receivedItems,
    receivedTransfers,
    dispatchedOrders,
    inTransitOrders,
    quarantineReturns,
    recentReturns,
    scheduledGatepasses,
    gateEvents,
    loadingNow,
    activeNow,
    doIndex,
  ] = await Promise.all([
    prisma.productionHandover.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { dailyReport: true, items: true, productionStaff: true }
    }),
    prisma.inventoryBatch.findMany({
      where: { availableBalance: { gt: 0 } },
      orderBy: [{ updatedAt: "desc" }, { batchNumber: "asc" }]
    }),
    prisma.inventoryBatch.findMany({
      where: { createdAt: { gte: twoWeeksAgo } },
      select: { createdAt: true }
    }),
    // A handover's `date` is the production day; `updatedAt` is when warehouse received it.
    prisma.handoverItem.findMany({
      where: { netToWarehousePcs: { gt: 0 }, handover: { status: "RECEIVED", updatedAt: { gte: historyStart, lt: tomorrowStart } } },
      select: { netToWarehousePcs: true, handoverId: true, handover: { select: { updatedAt: true } } }
    }),
    // Legacy daily-report transfers still add stock when received, so they count as inflow too.
    prisma.productionTransfer.findMany({
      where: { status: "RECEIVED", receivedAt: { gte: historyStart, lt: tomorrowStart } },
      select: { qtyProduced: true, receivedAt: true }
    }),
    prisma.distributionOrder.findMany({
      where: { status: { in: ["SHIPPED", "DELIVERED"] }, distributionDate: { gte: historyStart, lt: tomorrowStart } },
      select: { distributionDate: true, items: { select: { qtySent: true } } }
    }),
    prisma.distributionOrder.findMany({
      where: { status: "SHIPPED" },
      orderBy: { distributionDate: "asc" },
      select: { id: true, doNumber: true, destination: true, distributionDate: true, items: { select: { qtySent: true } } }
    }),
    prisma.goodsReturnNote.findMany({
      where: { status: "QUARANTINE" },
      select: { qtyReturned: true }
    }),
    prisma.goodsReturnNote.findMany({
      where: { loggedAt: { gte: historyStart } },
      select: { loggedAt: true, status: true }
    }),
    prisma.warehouseGatePass.findMany({
      where: { requestedPickupAt: { gte: historyStart, lt: tomorrowStart }, status: { notIn: [...INACTIVE_GATEPASS] } },
      select: { requestedPickupAt: true }
    }),
    prisma.gatePassStatusEvent.findMany({
      where: { toStatus: { in: ["CHECKED_IN", "CHECKED_OUT"] }, occurredAt: { gte: new Date(historyStart.getTime() - DAY_MS) } },
      orderBy: { occurredAt: "asc" },
      select: { gatePassId: true, toStatus: true, occurredAt: true }
    }),
    prisma.warehouseGatePass.count({ where: { status: "LOADING" } }),
    prisma.warehouseGatePass.count({ where: { status: { in: [...ACTIVE_GATEPASS] } } }),
    prisma.distributionOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, doNumber: true, destination: true, status: true }
    }),
  ])

  const daily = new Map<string, DailyFlow>()
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const date = mytDayKey(new Date(todayStart.getTime() - i * DAY_MS))
    daily.set(date, {
      date, inflowUnits: 0, handoversReceived: 0, batchesReceived: 0, outflowUnits: 0, dosDispatched: 0,
      returnsLogged: 0, gatepassesScheduled: 0, gateCheckouts: 0, turnaroundMinutesTotal: 0, turnaroundSamples: 0,
    })
  }
  const bucket = (date: Date) => daily.get(mytDayKey(date))

  const handoversSeen = new Set<string>()
  for (const item of receivedItems) {
    const day = bucket(item.handover.updatedAt)
    if (!day) continue
    day.inflowUnits += item.netToWarehousePcs
    day.batchesReceived += 1
    if (!handoversSeen.has(item.handoverId)) {
      handoversSeen.add(item.handoverId)
      day.handoversReceived += 1
    }
  }

  for (const transfer of receivedTransfers) {
    const day = transfer.receivedAt && bucket(transfer.receivedAt)
    if (!day) continue
    day.inflowUnits += transfer.qtyProduced
    day.batchesReceived += 1
  }

  for (const order of dispatchedOrders) {
    const day = bucket(order.distributionDate)
    if (!day) continue
    day.dosDispatched += 1
    day.outflowUnits += order.items.reduce((sum, item) => sum + item.qtySent, 0)
  }

  for (const grn of recentReturns) {
    const day = bucket(grn.loggedAt)
    if (day) day.returnsLogged += 1
  }

  for (const pass of scheduledGatepasses) {
    const day = bucket(pass.requestedPickupAt)
    if (day) day.gatepassesScheduled += 1
  }

  // Turnaround pairs each check-out with the latest check-in before it on the same pass.
  const lastCheckIn = new Map<string, Date>()
  for (const event of gateEvents) {
    if (event.toStatus === "CHECKED_IN") {
      lastCheckIn.set(event.gatePassId, event.occurredAt)
      continue
    }
    const day = bucket(event.occurredAt)
    if (!day) continue
    day.gateCheckouts += 1
    const checkedIn = lastCheckIn.get(event.gatePassId)
    if (checkedIn) {
      day.turnaroundMinutesTotal += (event.occurredAt.getTime() - checkedIn.getTime()) / 60_000
      day.turnaroundSamples += 1
      lastCheckIn.delete(event.gatePassId)
    }
  }

  const newBatchesByDay = Array.from({ length: 7 }, (_, index) => {
    const date = mytDayKey(new Date(todayStart.getTime() - (6 - index) * DAY_MS))
    return { date, count: 0 }
  })
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS)
  let newBatchesPrevWeek = 0
  for (const batch of recentBatches) {
    if (batch.createdAt < weekStart) {
      newBatchesPrevWeek += 1
      continue
    }
    const entry = newBatchesByDay.find(day => day.date === mytDayKey(batch.createdAt))
    if (entry) entry.count += 1
  }

  const recent30 = recentReturns.filter(grn => grn.loggedAt >= thirtyDaysAgo)
  const today = mytDayKey(now)

  const dashboard: WarehouseDashboardData = {
    today,
    monthStart: `${today.slice(0, 7)}-01`,
    capacityUnits: WAREHOUSE_CAPACITY_UNITS,
    batches: inventoryBatches.map(batch => ({
      batchNumber: batch.batchNumber,
      sku: batch.sku,
      available: batch.availableBalance,
      ageDays: Math.max(0, Math.floor((now.getTime() - batch.createdAt.getTime()) / DAY_MS)),
    })),
    newBatchesByDay,
    newBatchesPrevWeek,
    daily: [...daily.values()],
    pendingHandovers: pendingHandovers.length,
    inTransit: inTransitOrders.map(order => ({
      id: order.id,
      doNumber: order.doNumber,
      destination: order.destination,
      units: order.items.reduce((sum, item) => sum + item.qtySent, 0),
      daysInTransit: Math.max(0, Math.floor((todayStart.getTime() - mytStartOfDay(order.distributionDate).getTime()) / DAY_MS)),
    })),
    quarantine: {
      count: quarantineReturns.length,
      units: quarantineReturns.reduce((sum, grn) => sum + grn.qtyReturned, 0),
      logged30d: recent30.length,
      resolved30d: recent30.filter(grn => grn.status !== "QUARANTINE").length,
    },
    gatepass: { loadingNow, activeNow },
    doIndex: doIndex.map(order => ({ ...order, status: String(order.status) })),
  }

  return { dashboard, pendingHandovers, inventoryBatches }
}
