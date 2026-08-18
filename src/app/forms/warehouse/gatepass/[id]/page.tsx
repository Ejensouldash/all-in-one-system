import { notFound, redirect } from "next/navigation"
import { getWarehouseGatePass, listAvailableDistributionOrders } from "@/lib/warehouse/gatepass-service"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { GatePassOperations } from "./GatePassOperations"

export const dynamic = "force-dynamic"

export default async function GatePassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const capabilities = await getWarehouseOperationAccess()
  if (!capabilities) redirect("/login")
  if (!capabilities.requester) redirect("/forms")
  const { id } = await params
  const [gatePass, distributionOrders] = await Promise.all([
    getWarehouseGatePass(id),
    capabilities.warehouse ? listAvailableDistributionOrders() : Promise.resolve([]),
  ])
  if (!gatePass) notFound()

  const data = {
    ...gatePass,
    requestedPickupAt: gatePass.requestedPickupAt.toISOString(),
    confirmedEta: gatePass.confirmedEta?.toISOString() || null,
    customerSubmittedAt: gatePass.customerSubmittedAt?.toISOString() || null,
    warehouseAcknowledgedAt: gatePass.warehouseAcknowledgedAt?.toISOString() || null,
    readyAt: gatePass.readyAt?.toISOString() || null,
    checkedInAt: gatePass.checkedInAt?.toISOString() || null,
    loadingStartedAt: gatePass.loadingStartedAt?.toISOString() || null,
    loadingCompletedAt: gatePass.loadingCompletedAt?.toISOString() || null,
    checkedOutAt: gatePass.checkedOutAt?.toISOString() || null,
    completedAt: gatePass.completedAt?.toISOString() || null,
    cancelledAt: gatePass.cancelledAt?.toISOString() || null,
    createdAt: gatePass.createdAt.toISOString(),
    updatedAt: gatePass.updatedAt.toISOString(),
    statusEvents: gatePass.statusEvents.map(event => ({ ...event, occurredAt: event.occurredAt.toISOString() })),
    deliveryOrders: gatePass.deliveryOrders.map(link => ({
      ...link,
      linkedAt: link.linkedAt.toISOString(),
      distributionOrder: { ...link.distributionOrder, distributionDate: link.distributionOrder.distributionDate.toISOString() },
    })),
    palletTransfers: gatePass.palletTransfers.map(transfer => ({ ...transfer, occurredAt: transfer.occurredAt.toISOString() })),
  }
  const doOptions = distributionOrders.map(order => ({ ...order, distributionDate: order.distributionDate.toISOString() }))
  return <GatePassOperations gatePass={data} doOptions={doOptions} canWarehouse={capabilities.warehouse} canRequester={capabilities.requester} />
}
