import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

import { auth } from "@/auth"

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
