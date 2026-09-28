import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  UserCheck, 
  Calendar, 
  Wrench, 
  ExternalLink, 
  ArrowLeft,
  ShieldCheck,
  Building,
  Zap,
  Cog
} from "lucide-react"

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return {
    title: `Track Maintenance Request | BubblesO2`,
  }
}

export default async function PublicTicketTrackPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: {
      assignee: { select: { name: true } },
    },
  })

  if (!ticket) notFound()

  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
  const isCompleted = ticket.status === "COMPLETED"
  const isInProgress = ticket.status === "IN_PROGRESS"
  const isCancelled = ticket.status === "CANCELLED"
  const isRejected = ticket.status === "REJECTED"

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/public/maintenance/request"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Submit Another Request
          </Link>
          <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {formattedLog}
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-blue-500/20 text-blue-300 font-mono text-xs font-bold px-2.5 py-0.5 rounded border border-blue-400/30">
                {formattedLog}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-white/10 text-slate-300">
                {ticket.ticketType}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold">{ticket.title}</h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {ticket.location} {ticket.specificArea ? `• ${ticket.specificArea}` : ""}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Status Timeline */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Live Progress Status
              </h2>

              <div className="relative pl-6 space-y-6 border-l-2 border-slate-200">
                {/* Step 1: Received */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Request Received</h3>
                    <p className="text-[11px] text-slate-500">
                      Logged into BubblesO2 maintenance ledger on{" "}
                      {new Date(ticket.createdAt).toLocaleDateString("en-GB")}.
                    </p>
                  </div>
                </div>

                {/* Step 2: Under Review / In Progress */}
                <div className="relative">
                  <span
                    className={`absolute -left-[31px] top-0 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                      isCompleted || isInProgress
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isCompleted || isInProgress ? <Clock className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-slate-400" />}
                  </span>
                  <div>
                    <h3 className={`text-xs font-bold ${isCompleted || isInProgress ? "text-slate-900" : "text-slate-400"}`}>
                      {isInProgress ? "Work In Progress" : "Technician Assigned"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {ticket.assignee?.name || ticket.assigneeName ? (
                        <>Assigned PIC: <strong className="text-slate-700">{ticket.assignee?.name || ticket.assigneeName}</strong></>
                      ) : (
                        "Pending technician assignment"
                      )}
                    </p>
                    {ticket.targetDateline && (
                      <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                        Target Completion: {new Date(ticket.targetDateline).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 3: Resolution */}
                <div className="relative">
                  <span
                    className={`absolute -left-[31px] top-0 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCancelled || isRejected
                        ? "bg-red-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isCancelled || isRejected ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                    )}
                  </span>
                  <div>
                    <h3 className={`text-xs font-bold ${isCompleted ? "text-emerald-700" : isCancelled || isRejected ? "text-red-700" : "text-slate-400"}`}>
                      {isCompleted
                        ? "Work Completed & Verified"
                        : isCancelled
                        ? "Request Cancelled"
                        : isRejected
                        ? "Request Not Approved"
                        : "Work Completion"}
                    </h3>
                    {ticket.completedAt && (
                      <p className="text-[11px] text-slate-500">
                        Finished on {new Date(ticket.completedAt).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution notes if present */}
            {ticket.resolution && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Maintenance Actions / Resolution
                </p>
                <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed">
                  {ticket.resolution}
                </p>
              </div>
            )}

            {/* Damage Photo preview if exists */}
            {ticket.photoUrl && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Submitted Photo
                </p>
                <img
                  src={ticket.photoUrl}
                  alt="Damage photo"
                  className="w-full max-h-56 object-cover rounded-xl border border-slate-200"
                />
              </div>
            )}

            {/* Requester Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Requester</span>
                <span className="font-semibold text-slate-900">{ticket.requesterName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Priority</span>
                <span className="font-bold text-orange-600">{ticket.priority}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
