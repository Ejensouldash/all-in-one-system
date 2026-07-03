import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Package, ArrowUpRight, ArrowDownRight, History } from "lucide-react"
import { getBatchLedger } from "@/app/actions/warehouse"
import { prisma } from "@/lib/prisma"

export default async function BatchHistoryPage({ params }: { params: Promise<{ batchNumber: string }> }) {
  const resolvedParams = await params
  const batchNumber = decodeURIComponent(resolvedParams.batchNumber)

  // Fetch the current state of the batch
  const batch = await prisma.inventoryBatch.findUnique({
    where: { batchNumber }
  })

  if (!batch) {
    redirect("/forms/warehouse/dashboard")
  }

  // Fetch the ledger
  const ledgerRes = await getBatchLedger(batchNumber)
  const ledger = ledgerRes.success ? ledgerRes.data || [] : []

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/forms/warehouse/dashboard">
            <div className="p-3 bg-white border-2 border-black rounded shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer">
              <ChevronLeft className="w-6 h-6" />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              Batch History
            </h1>
            <p className="text-gray-600 font-medium mt-1">Detailed ledger for <span className="font-bold text-black">{batchNumber}</span> ({batch.sku})</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total In</p>
                <p className="text-3xl font-black text-emerald-600 mt-2">{batch.totalQtyIn}</p>
              </div>
              <ArrowDownRight className="w-10 h-10 text-emerald-200" />
            </div>
          </div>
          <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Out</p>
                <p className="text-3xl font-black text-rose-600 mt-2">{batch.totalQtyOut}</p>
              </div>
              <ArrowUpRight className="w-10 h-10 text-rose-200" />
            </div>
          </div>
          <div className="bg-blue-600 border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-200 uppercase tracking-widest">Available</p>
                <p className="text-3xl font-black mt-2">{batch.availableBalance}</p>
              </div>
              <Package className="w-10 h-10 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="p-4 border-b-2 border-black bg-gray-100 flex items-center gap-2">
            <History className="w-5 h-5" />
            <h2 className="font-black uppercase tracking-widest">Transaction Ledger</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-black text-sm uppercase tracking-wider font-bold">
                  <th className="p-4 border-r-2 border-gray-200">Date & Time</th>
                  <th className="p-4 border-r-2 border-gray-200">Type</th>
                  <th className="p-4 border-r-2 border-gray-200">Reference</th>
                  <th className="p-4 border-r-2 border-gray-200 text-right">Qty</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium border-b-2 border-gray-100">
                      No transaction history found for this batch.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry, idx) => (
                    <tr key={idx} className="border-b-2 border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 border-r-2 border-gray-100 whitespace-nowrap">
                        <span className="font-bold">{entry.date.toLocaleDateString('en-GB')}</span>
                        <span className="text-gray-500 text-sm ml-2">{entry.date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4 border-r-2 border-gray-100">
                        {entry.type === "IN" && <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-xs"><ArrowDownRight className="w-3 h-3"/> IN</span>}
                        {entry.type === "OUT" && <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded text-xs"><ArrowUpRight className="w-3 h-3"/> OUT</span>}
                        {entry.type === "ADJUSTMENT" && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded text-xs">ADJUSTMENT</span>}
                      </td>
                      <td className="p-4 border-r-2 border-gray-100 font-medium">
                        {entry.reference}
                      </td>
                      <td className={`p-4 border-r-2 border-gray-100 text-right font-black ${entry.type === 'IN' || entry.type === 'ADJUSTMENT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {entry.type === 'IN' || entry.type === 'ADJUSTMENT' ? '+' : '-'}{entry.qty}
                      </td>
                      <td className="p-4 text-gray-600 text-sm">
                        {entry.remarks || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
