import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AssetDetailClient } from "./AssetDetailClient"

export async function generateMetadata({ params }: { params: { id: string } }) {
  const asset = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!asset) return { title: "Not Found" }
  return { title: `${asset.name} - Asset Details` }
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      location: true,
      maintenance: {
        orderBy: { date: 'desc' }
      }
    }
  })

  if (!asset) {
    notFound()
  }

  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <AssetDetailClient asset={asset} departments={departments} locations={locations} />
    </div>
  )
}