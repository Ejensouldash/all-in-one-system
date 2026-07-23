import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AssetDetailClient } from "./AssetDetailClient"

// Cached per-request so generateMetadata and the page body share one query
// instead of each fetching the same asset separately.
const getAsset = cache(async (id: string) => {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      department: true,
      location: true,
      maintenance: {
        orderBy: { date: 'desc' }
      }
    }
  })
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAsset(id)
  if (!asset) return { title: "Not Found" }
  return { title: `${asset.name} - Asset Details` }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // const session = await auth()
  // if (!session) redirect("/login")

  const { id } = await params;

  const [asset, departments, locations] = await Promise.all([
    getAsset(id),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } })
  ])

  if (!asset) {
    notFound()
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <AssetDetailClient asset={asset} departments={departments} locations={locations} />
    </div>
  )
}