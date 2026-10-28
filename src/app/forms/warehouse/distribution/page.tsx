import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Truck, Plus } from "lucide-react"
import { DistributionClient } from "@/components/forms/DistributionClient"

export default async function DistributionIndex() {
  const session = await auth()
  if (!session) redirect("/login")

  const distributionOrders = await prisma.distributionOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: true,
      items: true,
      trackingEvents: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Truck className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Outbound Logistics
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Distribution Orders
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Manage dispatches, track active transport routes, and generate proof of delivery (POD).
          </p>
        </div>

        <Link
          href="/forms/warehouse/distribution/new"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-xs transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Create DO
        </Link>
      </div>

      <DistributionClient distributionOrders={distributionOrders} />
    </div>
  )
}
