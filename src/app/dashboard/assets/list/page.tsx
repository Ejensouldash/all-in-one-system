import { prisma } from "@/lib/prisma"
import { DataTable } from "./data-table"

export default async function AssetsListPage() {
  // Fetch all assets for the master list
  // In a massive production system (10,000+ rows), this should use server-side pagination, 
  // but for 300+ items, pulling it all at once to allow instant client-side filtering is excellent.
  const assets = await prisma.asset.findMany({
    include: {
      department: true,
      location: true
    },
    orderBy: {
      assetTag: 'asc'
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Asset List</h1>
        <p className="text-slate-500 mt-1">Complete registry of all registered company assets.</p>
      </div>

      <DataTable initialAssets={assets} />
    </div>
  )
}