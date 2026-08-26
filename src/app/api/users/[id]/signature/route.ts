import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSignatureBufferFromR2 } from "@/lib/signature-storage"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await context.params
    if (!id) {
      return new NextResponse("Missing user ID", { status: 400 })
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, signatureUrl: true }
    })

    if (!user || !user.signatureUrl) {
      return new NextResponse("Signature not found", { status: 404 })
    }

    const buffer = await getSignatureBufferFromR2(id)
    if (!buffer) {
      return new NextResponse("Signature image not found in storage", { status: 404 })
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error: any) {
    console.error("Error serving signature:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
