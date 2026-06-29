import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ReceiveTransferButton } from "./ReceiveTransferButton"
import { CheckCircle2, Clock } from "lucide-react"

export default async function WarehouseDashboard() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const pendingTransfers = await prisma.productionTransfer.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: 'asc' },
    include: { dailyReport: true }
  })

  const inventoryBatches = await prisma.inventoryBatch.findMany({
    where: { availableBalance: { gt: 0 } },
    orderBy: { batchNumber: 'asc' }
  })

  return (
    <div className="space-y-12">
      
      {/* PENDING TRANSFERS */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center">
          <span className="w-3 h-3 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
          Pending Transfers from Production
        </h2>
        
        {pendingTransfers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">No pending transfers waiting to be received.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTransfers.map((t) => (
              <div key={t.id} className="bg-white border-2 border-amber-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded-bl-lg">
                  PENDING
                </div>
                
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {new Date(t.createdAt).toLocaleDateString('en-GB')} {new Date(t.createdAt).toLocaleTimeString()}
                  </p>
                  <h3 className="text-lg font-black text-gray-900">{formatSKU(t.sku)}</h3>
                  <p className="text-sm font-bold text-gray-600 mt-1">Batch: <span className="text-indigo-600">{t.batchNumber}</span></p>
                  <p className="text-2xl font-black text-emerald-700 mt-2">{t.qtyProduced} <span className="text-xs text-gray-500">Qty</span></p>
                </div>
                
                <ReceiveTransferButton transferId={t.id} userId={user.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MASTER INVENTORY */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center">
          <DatabaseIcon className="w-5 h-5 mr-2 text-indigo-600" />
          Live Inventory (Available Batches)
        </h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Batch No</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Total In</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Total Out</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-black text-emerald-700 uppercase tracking-wider bg-emerald-50">Available</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                    No active inventory found.
                  </td>
                </tr>
              ) : (
                inventoryBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatSKU(batch.sku)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{batch.batchNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500 text-center">{batch.totalQtyIn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600 text-center">{batch.totalQtyOut}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-black text-emerald-700 text-right bg-emerald-50/30">{batch.availableBalance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  )
}

function formatSKU(sku: string) {
  if (!sku) return sku;
  return sku.replace('p800_', '800ml x ').replace('p425_', '425ml x ').toUpperCase();
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
