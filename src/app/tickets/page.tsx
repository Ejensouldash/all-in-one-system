import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Clock, CheckCircle2, AlertCircle, Eye, Edit3 } from "lucide-react"
import { NewTicketButton } from "./NewTicketButton"
import { TicketTable } from "@/components/tickets/TicketTable"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export default async function TicketsPage(props: { searchParams?: Promise<{ query?: string; page?: string }> }) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ""
  const currentPage = Number(searchParams?.page) || 1
  const ITEMS_PER_PAGE = 50

  const session = await auth()
  if (!session) return null

  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["TICKETS"])) redirect("/dashboard")

  const isSuperAdmin = access.isSuperAdmin

  const baseWhere = isSuperAdmin 
    ? {} 
    : { OR: [{ createdById: session.user.id }, { unitId: session.user.unitId }] }

  const ticketNumberMatch = query.match(/\d+/)
  const searchTicketNumber = ticketNumberMatch ? parseInt(ticketNumberMatch[0], 10) : null

  const searchWhere = query ? {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { requesterName: { contains: query, mode: "insensitive" } },
      ...(searchTicketNumber ? [{ ticketNumber: searchTicketNumber }] : [])
    ]
  } : {}

  const whereClause = { ...baseWhere, ...searchWhere }

  const totalTickets = await prisma.ticket.count({ where: whereClause as any })
  const totalPages = Math.ceil(totalTickets / ITEMS_PER_PAGE)

  const tickets = await prisma.ticket.findMany({
    where: whereClause as any,
    include: { createdBy: true, linkedAsset: true },
    orderBy: { createdAt: 'desc' },
    take: ITEMS_PER_PAGE,
    skip: (currentPage - 1) * ITEMS_PER_PAGE
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">IT Tickets</h1>
          <p className="text-gray-500 mt-1">
            {isSuperAdmin ? "Manage all company IT requests." : "Track your department's IT requests."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchInput placeholder="Search tickets..." />
          </div>
          <NewTicketButton />
        </div>
      </div>

      <TicketTable tickets={tickets} isSuperAdmin={isSuperAdmin} />
      <Pagination totalPages={totalPages} />
    </div>
  )
}
