import { notFound, redirect } from "next/navigation"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { getSecurityGatePassByCode } from "@/lib/warehouse/gatepass-service"
import { SecurityGatePassControl } from "./SecurityGatePassControl"

export const dynamic = "force-dynamic"

export default async function SecurityGatePassDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const capabilities = await getWarehouseOperationAccess()
  if (!capabilities) redirect("/login")
  if (!capabilities.security) redirect("/forms")
  const { code } = await params
  const gatePass = await getSecurityGatePassByCode(code)
  if (!gatePass) notFound()
  const data = {
    id: gatePass.id,
    gatePassNo: gatePass.gatePassNo,
    status: gatePass.status,
    requestedPickupAt: gatePass.requestedPickupAt.toISOString(),
    pickupLocation: gatePass.pickupLocation,
    destination: gatePass.destination,
    customerName: gatePass.customerName,
    transportCompany: gatePass.transportCompany,
    driverName: gatePass.driverName,
    driverPhone: gatePass.driverPhone,
    vehicleNo: gatePass.vehicleNo,
    vehicleType: gatePass.vehicleType,
    checkedInVehicleNo: gatePass.checkedInVehicleNo,
    checkedInDriverName: gatePass.checkedInDriverName,
    checkedInAt: gatePass.checkedInAt?.toISOString() || null,
    loadingCompletedAt: gatePass.loadingCompletedAt?.toISOString() || null,
    checkedOutAt: gatePass.checkedOutAt?.toISOString() || null,
    plannedPalletQty: gatePass.plannedPalletQty,
    actualPalletQty: gatePass.actualPalletQty,
    items: gatePass.items.map(item => ({ id: item.id, description: item.description, sku: item.sku, uom: item.uom, plannedQty: item.plannedQty, actualQty: item.actualQty })),
    deliveryOrders: gatePass.deliveryOrders.map(link => link.distributionOrder),
  }
  return <SecurityGatePassControl gatePass={data} />
}
