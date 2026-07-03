import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AssetDetailClient } from "./AssetDetailClient"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } })
  if (!asset) return { title: "Not Found" }
  return { title: `${asset.name} - Asset Details` }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // const session = await auth()
  // if (!session) redirect("/login")
  
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
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