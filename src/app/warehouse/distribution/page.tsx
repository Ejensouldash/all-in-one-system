import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Truck, Plus, Printer, AlertTriangle } from "lucide-react"

export default async function DistributionIndex() {
  const session = await auth()
  if (!session) redirect("/login")

  const distributionOrders = await prisma.distributionOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: true,
      items: true
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center">
          <Truck className="w-5 h-5 mr-2 text-blue-600" />
          Distribution Orders
        </h2>
        <Link 
          href="/warehouse/distribution/new"
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all text-sm uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create DO
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">DO Number</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Destination</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Method</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {distributionOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                  No Distribution Orders created yet.
                </td>
              </tr>
            ) : (
              distributionOrders.map((doOrder) => (
                <tr key={doOrder.id} className="hover:bg-blue-50/50">
                  <td className="px-6 py-4 whitespace-nowrap font-black text-blue-700">{doOrder.doNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                    {new Date(doOrder.distributionDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{doOrder.destination}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">{doOrder.distributionMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 inline-flex text-[10px] leading-5 font-black uppercase rounded ${
                      doOrder.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                      doOrder.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                      doOrder.status === 'RETURNED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doOrder.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <Link href={`/warehouse/distribution/${doOrder.id}/pod`} className="text-gray-500 hover:text-indigo-600 font-bold flex items-center bg-gray-100 hover:bg-indigo-50 px-3 py-1 rounded">
                        <Printer className="w-4 h-4 mr-2" /> Print POD
                      </Link>
                      
                      {/* Simple button linking to return form, to be implemented */}
                      <Link href={`/warehouse/quarantine/new?doId=${doOrder.id}`} className="text-gray-500 hover:text-red-600 font-bold flex items-center bg-gray-100 hover:bg-red-50 px-3 py-1 rounded" title="Log Return / Damage">
                        <AlertTriangle className="w-4 h-4" />
                      </Link>
                    </div>
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
