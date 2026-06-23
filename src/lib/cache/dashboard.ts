import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const getDashboardStats = unstable_cache(
  async (unitId: string | null, isSuperAdmin: boolean) => {
    
    // Reconstruct ticketScope to avoid passing complex objects
    const ticketScope = isSuperAdmin ? {} : { unitId }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const totalTickets = await prisma.ticket.count({ where: ticketScope as any })
    
    const pendingTickets = await prisma.ticket.count({
      where: { ...ticketScope, status: { in: ["OPEN", "IN_PROGRESS"] } } as any
    })
    
    const resolvedToday = await prisma.ticket.count({
      where: { 
        ...ticketScope, 
        status: "RESOLVED",
        updatedAt: { gte: todayStart, lte: todayEnd }
      } as any
    })

    const activeAssets = isSuperAdmin ? await prisma.asset.count({ where: { status: "ACTIVE" } }) : 0
    
    const upcomingEvents = await prisma.event.count({
      where: {
        startDateTime: { gte: todayStart }
      }
    })

    const openCount = await prisma.ticket.count({ where: { ...ticketScope, status: "OPEN" } as any })
    const inProgressCount = await prisma.ticket.count({ where: { ...ticketScope, status: "IN_PROGRESS" } as any })
    const resolvedCount = await prisma.ticket.count({ where: { ...ticketScope, status: "RESOLVED" } as any })
    
    const statusData = [
      { name: 'Resolved', value: resolvedCount },
      { name: 'In Progress', value: inProgressCount },
      { name: 'Open', value: openCount },
    ]

    let departmentData: any[] = []
    if (isSuperAdmin) {
      const deptStats = await prisma.ticket.groupBy({
        by: ['unitId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 6
      })
      departmentData = await Promise.all(deptStats.map(async (stat) => {
        if (!stat.unitId) return { name: "Unknown", tickets: stat._count.id }
        const unit = await prisma.unit.findUnique({ where: { id: stat.unitId } })
        return { name: unit?.name || "Unknown", tickets: stat._count.id }
      }))
    }

    return {
      totalTickets,
      pendingTickets,
      resolvedToday,
      activeAssets,
      upcomingEvents,
      statusData,
      departmentData
    }
  },
  ['dashboard-kpi-stats'], // Cache key prefix
  { revalidate: 60, tags: ['dashboard'] }
)
