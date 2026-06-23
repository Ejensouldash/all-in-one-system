import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SmartUpload } from "./SmartUpload"
import { AssetTableClient } from "@/components/assets/AssetTableClient"
import { AddAssetModal } from "@/components/assets/AddAssetModal"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"

export default async function AssetsPage(props: { searchParams?: Promise<{ query?: string; page?: string }> }) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ""
  const currentPage = Number(searchParams?.page) || 1
  const ITEMS_PER_PAGE = 50

  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") redirect("/dashboard")

  const searchWhere = query ? {
    OR: [
      { assetTag: { contains: query, mode: "insensitive" } },
      { brand: { contains: query, mode: "insensitive" } },
      { model: { contains: query, mode: "insensitive" } },
      { serialNumber: { contains: query, mode: "insensitive" } }
    ]
  } : {}

  const totalAssets = await prisma.asset.count({ where: searchWhere as any })
  const totalPages = Math.ceil(totalAssets / ITEMS_PER_PAGE)

  const assets = await prisma.asset.findMany({
    where: searchWhere as any,
    include: { unit: true },
    orderBy: { createdAt: 'desc' },
    take: ITEMS_PER_PAGE,
    skip: (currentPage - 1) * ITEMS_PER_PAGE
  })

  const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Asset Management</h1>
          <p className="text-gray-500 mt-1">Manage company hardware, assignments, and bulk upload inventory.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchInput placeholder="Search assets..." />
          </div>
          <AddAssetModal units={units} />
          <SmartUpload />
        </div>
      </div>

      <div className="space-y-4">
        <AssetTableClient assets={assets} units={units} />
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  )
}
