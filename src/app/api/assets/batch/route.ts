import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { ids } = await req.json()
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 })
    }

    const assets = await prisma.asset.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        department: true
      }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error("Batch assets error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
