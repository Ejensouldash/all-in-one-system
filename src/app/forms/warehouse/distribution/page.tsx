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
          href="/forms/warehouse/distribution/new"
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all text-sm uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create DO
        </Link>
      </div>

      <DistributionClient distributionOrders={distributionOrders} />
    </div>
  )
}
