import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AlertOctagon, Plus } from "lucide-react"
import Link from "next/link"

export default async function QuarantinePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const returns = await prisma.goodsReturnNote.findMany({
    orderBy: { loggedAt: 'desc' },
    include: {
      distributionOrder: true
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center text-red-900">
            <AlertOctagon className="w-5 h-5 mr-2 text-red-600" />
            Quarantine Area (Reverse Logistics)
          </h2>
          <p className="text-sm font-bold text-red-700 mt-1">Returned goods are strictly quarantined and do not restock automatically.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] border-2 border-red-600 overflow-hidden">
        <table className="min-w-full divide-y divide-red-200 table-fixed">
          <thead className="bg-red-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-red-800 uppercase tracking-wider">DO Reference</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-red-800 uppercase tracking-wider">Date Logged</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-red-800 uppercase tracking-wider">SKU / Batch</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-black text-red-800 uppercase tracking-wider">Qty Returned</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-red-800 uppercase tracking-wider">Reason</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-black text-red-800 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-red-100">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                  No returned goods in quarantine.
                </td>
              </tr>
            ) : (
              returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-red-50/50">
                  <td className="px-6 py-4 whitespace-nowrap font-black text-blue-700">
                    <Link href={`/warehouse/distribution/${ret.distributionOrderId}/pod`} className="hover:underline">
                      {ret.distributionOrder.doNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                    {new Date(ret.loggedAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-black text-gray-900">{ret.sku}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{ret.batchNumber}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-lg font-black text-red-600">
                    {ret.qtyReturned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                    {ret.reason.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-3 py-1 inline-flex text-[10px] leading-5 font-black uppercase rounded border border-red-500 bg-red-100 text-red-800 animate-pulse">
                      {ret.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
