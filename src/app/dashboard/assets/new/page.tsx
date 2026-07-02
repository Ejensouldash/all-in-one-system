import { prisma } from "@/lib/prisma"
import { AssetForm } from "./AssetForm"

export const metadata = {
  title: "New Asset - BubblesO2 AIO System",
}

export default async function NewAssetPage() {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Register New Asset</h1>
        <AssetForm departments={departments} locations={locations} />
      </div>
    </div>
  )
}