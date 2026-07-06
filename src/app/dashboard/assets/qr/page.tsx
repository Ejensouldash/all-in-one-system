import { prisma } from "@/lib/prisma"
import { QRStickerPrintClient } from "./QRStickerPrintClient"

export default async function QRStickerPrintPage() {
  const assets = await prisma.asset.findMany({
    include: { department: true, location: true },
    orderBy: { assetTag: "asc" },
  })

  return <QRStickerPrintClient assets={assets} />
}
