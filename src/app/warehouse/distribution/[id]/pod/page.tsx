import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer, CheckSquare } from "lucide-react"
import { PrintButton } from "./PrintButton"

export default async function PODView({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) redirect("/login")

  const doOrder = await prisma.distributionOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      createdBy: true
    }
  })

  if (!doOrder) {
    return <div>DO Not Found</div>
  }

  // GROUP ITEMS BY SKU (Crucial Requirement: Hide batch numbers from external logistics)
  const groupedItems = doOrder.items.reduce((acc: any, item) => {
    if (!acc[item.sku]) {
      acc[item.sku] = { sku: item.sku, totalQty: 0 }
    }
    acc[item.sku].totalQty += item.qtySent
    return acc
  }, {})

  const displayItems = Object.values(groupedItems)

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-6 flex justify-between items-center print:hidden">
        <Link href="/warehouse/distribution" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to DO List
        </Link>
        <PrintButton />
      </div>

      <div id="print-area" className="bg-white border-2 border-black p-8 sm:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] print:shadow-none print:border-none print:p-0">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">BubblesO2</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Proof of Delivery</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black">{doOrder.doNumber}</h2>
            <p className="text-sm font-bold text-gray-600 mt-1">Date: {new Date(doOrder.distributionDate).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* DETAILS */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-wider">Deliver To</h3>
            <p className="text-lg font-bold">{doOrder.destination}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-wider">Logistics Details</h3>
            <p className="font-bold">Method: {doOrder.distributionMethod}</p>
            {doOrder.driverName && <p className="font-bold">Driver: {doOrder.driverName}</p>}
            {doOrder.vehicleNo && <p className="font-bold">Vehicle: {doOrder.vehicleNo}</p>}
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mb-12">
          <table className="w-full text-left border-collapse border-2 border-black">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="p-3 border-r-2 border-black font-black uppercase tracking-wider text-xs w-16 text-center">No</th>
                <th className="p-3 border-r-2 border-black font-black uppercase tracking-wider text-xs">Item / SKU</th>
                <th className="p-3 font-black uppercase tracking-wider text-xs w-32 text-center">Total Qty</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item: any, idx: number) => (
                <tr key={idx} className="border-b-2 border-gray-300">
                  <td className="p-3 border-r-2 border-black text-center font-bold">{idx + 1}</td>
                  <td className="p-3 border-r-2 border-black font-bold text-lg">{item.sku}</td>
                  <td className="p-3 text-center font-black text-xl">{item.totalQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SIGNATURES */}
        <div className="grid grid-cols-2 gap-16 mt-16 pt-8 border-t-2 border-dashed border-gray-300">
          <div>
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-wider">Issued By (Warehouse)</h3>
            <div className="border-b-2 border-black w-full mb-2"></div>
            <p className="font-bold text-sm">Name: {doOrder.createdBy.name}</p>
            <p className="font-bold text-sm">Date: ________________________</p>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-wider">Received By (Driver/Customer)</h3>
            <div className="border-b-2 border-black w-full mb-2"></div>
            <p className="font-bold text-sm">Name: ________________________</p>
            <p className="font-bold text-sm">IC/No: ________________________</p>
            <p className="font-bold text-sm">Date: ________________________</p>
          </div>
        </div>

      </div>
    </div>
  )
}
