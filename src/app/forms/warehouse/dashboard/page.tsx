import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { LiveInventoryTable } from "@/components/warehouse/LiveInventoryTable"

async function AsyncWarehouseContent() {
  const [pendingHandovers, inventoryBatches] = await Promise.all([
    prisma.productionHandover.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: 'asc' },
      include: { dailyReport: true, items: true, productionStaff: true }
    }),
    prisma.inventoryBatch.findMany({
      where: { availableBalance: { gt: 0 } },
      orderBy: { batchNumber: 'asc' }
    })
  ])

  return (
    <div className="space-y-12">
      {/* PENDING TRANSFERS */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center">
          <span className="w-3 h-3 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
          Pending Handovers from Production
        </h2>
        
        {pendingHandovers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">No pending handovers waiting to be received.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingHandovers.map((h) => {
              const totalNet = h.items.reduce((sum, item) => sum + item.netToWarehousePcs, 0)
              
              return (
                <div key={h.id} className="bg-white border-2 border-amber-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded-bl-lg">
                    PENDING
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                      {new Date(h.createdAt).toLocaleDateString('en-GB')} {new Date(h.createdAt).toLocaleTimeString()}
                    </p>
                    <h3 className="text-lg font-black text-gray-900">{h.handoverNumber}</h3>
                    <p className="text-sm font-bold text-gray-600 mt-1">From: <span className="text-indigo-600">{h.productionStaff.name}</span></p>
                    <p className="text-2xl font-black text-emerald-700 mt-2">{totalNet} <span className="text-xs text-gray-500">Pcs Net</span></p>
                  </div>
                  
                  <Link href={`/forms/warehouse/handover/${h.id}`} className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
                    View & Receive
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MASTER INVENTORY */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center">
          <DatabaseIcon className="w-5 h-5 mr-2 text-indigo-600" />
          Live Inventory (Available Batches)
        </h2>
        
        <LiveInventoryTable inventoryBatches={inventoryBatches} />
      </div>
    </div>
  )
}

function WarehouseSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      <div className="h-48 bg-white border border-gray-200 rounded-xl p-6"></div>
      <div className="h-96 bg-white border border-gray-200 rounded-xl p-6"></div>
    </div>
  )
}

export default async function WarehouseDashboard() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <Suspense fallback={<WarehouseSkeleton />}>
      <AsyncWarehouseContent />
    </Suspense>
  )
}

function DatabaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}
