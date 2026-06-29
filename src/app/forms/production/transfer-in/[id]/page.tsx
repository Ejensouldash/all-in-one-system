import { getTransferInById } from "@/app/actions/transferIn"
import Link from "next/link"
import { Package, Calendar, Clock, User, ArrowLeft } from "lucide-react"

export default async function TransferInDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const result = await getTransferInById(resolvedParams.id)
  
  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">DO Not Found</h2>
          <p className="text-gray-500 mb-2">The Delivery Order you are looking for does not exist or could not be loaded.</p>
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-md mb-6 text-left break-all font-mono">
            Debug ID: {resolvedParams?.id}<br/>
            Error: {result?.error || "Null Data"}
          </div>
          <Link href="/forms/production/transfer-in/history" className="inline-flex items-center justify-center w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to History
          </Link>
        </div>
      </div>
    )
  }

  const transfer = result.data

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 mt-8 pb-12">
      
      <div className="flex items-center justify-between mb-8">
        <Link href="/forms/production/transfer-in/history" className="inline-flex items-center text-emerald-600 hover:text-emerald-800 font-bold bg-emerald-50 px-4 py-2 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-emerald-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 text-xs font-bold uppercase tracking-widest mb-4">
              Transfer In Log
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">DO: {transfer.doNumber}</h1>
            <p className="text-emerald-200 font-medium text-lg">
              Detailed breakdown of items received in this Delivery Order.
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center text-gray-500 mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Date Received</span>
              </div>
              <p className="text-lg font-black text-gray-900">{new Date(transfer.receiveDate).toLocaleDateString('en-GB')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center text-gray-500 mb-1">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Time Received</span>
              </div>
              <p className="text-lg font-black text-gray-900">{transfer.receiveTime}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center text-gray-500 mb-1">
                <Package className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">DO Number</span>
              </div>
              <p className="text-lg font-black text-gray-900">{transfer.doNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center text-gray-500 mb-1">
                <User className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Receiver</span>
              </div>
              <p className="text-lg font-black text-gray-900 truncate">{transfer.receiverName}</p>
            </div>
          </div>

          <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-4 flex items-center border-b-2 border-emerald-100 pb-2">
            Received Items
          </h3>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Batch No / Lot</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Bags/Boxes</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Multiplier</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-black text-emerald-600 uppercase tracking-wider">Total Pieces</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfer.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {item.batchNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-gray-900">
                      {item.bags}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      x {item.mult}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-right text-emerald-700 bg-emerald-50/30">
                      {(item.bags * item.mult).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
