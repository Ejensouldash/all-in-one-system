import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { TechnicianWorkForm } from "./TechnicianWorkForm"
import { Wrench, MapPin, Clock, AlertTriangle, ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Technician & Contractor Work Area | BubblesO2",
}

export default async function TechnicianWorkPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await props.params
  const { token } = await props.searchParams
  const session = await auth()

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      assignee: { select: { id: true, name: true } },
    },
  })

  if (!ticket) notFound()

  // Access validation:
  // 1. Valid contractorToken provided in query params, OR
  // 2. Authenticated user
  const isContractorAuthorized = token && ticket.contractorToken === token
  const isInternalUser = !!session?.user?.id

  if (!isContractorAuthorized && !isInternalUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
          <div className="h-12 w-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This technician job portal requires a valid contractor magic access link or an active internal staff login. Please contact BubblesO2 maintenance PIC if you need access.
          </p>
        </div>
      </div>
    )
  }

  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {formattedLog}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-white/10 text-slate-200">
                {ticket.ticketType}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              ticket.priority === 'URGENT' ? 'bg-red-500 text-white' : 'bg-white/20 text-slate-200'
            }`}>
              {ticket.priority}
            </span>
          </div>

          <h1 className="text-lg sm:text-xl font-black">{ticket.title}</h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>{ticket.location} {ticket.specificArea ? `• ${ticket.specificArea}` : ""}</span>
          </p>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>Requester: <strong className="text-white">{ticket.requesterName}</strong></span>
            {ticket.targetDateline && (
              <span className="flex items-center gap-1 text-blue-300 font-semibold">
                <Clock className="h-3 w-3" />
                Target: {new Date(ticket.targetDateline).toLocaleDateString("en-GB")}
              </span>
            )}
          </div>
        </div>

        {/* Work Form */}
        <TechnicianWorkForm ticket={ticket} contractorToken={token} />
      </div>
    </div>
  )
}
