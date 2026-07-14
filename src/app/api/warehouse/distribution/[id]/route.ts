import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

import { auth } from "@/auth"

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params
    const doOrder = await prisma.distributionOrder.findUnique({
      where: { id },
      include: {
        items: true,
        createdBy: true
      }
    })
    
    if (!doOrder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    
    return NextResponse.json(doOrder)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch DO" }, { status: 500 })
  }
}
