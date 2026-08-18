import { notFound, redirect } from "next/navigation"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { getAccessInfo } from "@/lib/access"
import { getPalletTransfer } from "@/lib/warehouse/pallet-ledger-service"
import { PalletTransferOperations } from "./PalletTransferOperations"

export const dynamic = "force-dynamic"

export default async function PalletTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  const { id } = await params
  const transfer = await getPalletTransfer(id)
  if (!transfer) notFound()
  const data = {
    id: transfer.id,
    transferNo: transfer.transferNo,
    status: transfer.status,
    movementType: transfer.movementType,
    occurredAt: transfer.occurredAt.toISOString(),
    postedAt: transfer.postedAt?.toISOString() || null,
    reversedAt: transfer.reversedAt?.toISOString() || null,
    reversalReason: transfer.reversalReason,
    fromCustodian: { name: transfer.fromCustodian.name, kind: transfer.fromCustodian.kind },
    toCustodian: { name: transfer.toCustodian.name, kind: transfer.toCustodian.kind },
    transportCompany: transfer.transportCompany,
    driverName: transfer.driverName,
    vehicleNo: transfer.vehicleNo,
    remarks: transfer.remarks,
    evidenceUrl: transfer.evidenceUrl,
    releasedSignature: transfer.releasedSignature,
    receivedByName: transfer.receivedByName,
    receivedSignature: transfer.receivedSignature,
    createdBy: transfer.createdBy,
    postedBy: transfer.postedBy,
    reversedBy: transfer.reversedBy,
    gatePass: transfer.gatePass,
    distributionOrder: transfer.distributionOrder,
    lines: transfer.lines.map(line => ({ id: line.id, quantity: line.quantity, fromCondition: line.fromCondition, toCondition: line.toCondition, remarks: line.remarks, palletType: { code: line.palletType.code, name: line.palletType.name } })),
    movementCount: transfer.movements.length,
  }
  return <div className="min-h-screen bg-stone-50 pb-12"><div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6"><MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} /><PalletTransferOperations transfer={data} /></div></div>
}
