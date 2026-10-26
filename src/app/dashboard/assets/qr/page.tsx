import { prisma } from "@/lib/prisma"
import { QRStickerPrintClient } from "./QRStickerPrintClient"

export default async function QRStickerPrintPage() {
  const [assets, departments] = await Promise.all([
    prisma.asset.findMany({
      include: { department: true, location: true },
      orderBy: { assetTag: "asc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <QRStickerPrintClient assets={assets} departments={departments} />
}
