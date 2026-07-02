import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')

  if (!tag) {
    return NextResponse.json({ error: 'Tag parameter is required' }, { status: 400 })
  }

  try {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { assetTag: { equals: tag, mode: 'insensitive' } },
          { serialNumber: { equals: tag, mode: 'insensitive' } }
        ]
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Lookup error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
