import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  ArrowLeft,
  FileText,
  Download,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  UserCheck
} from "lucide-react"
import { RequesterVerificationCard } from "./RequesterVerificationCard"

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return {
    title: `Track Maintenance Ticket | BubblesO2`,
  }
}

export default async function PublicTicketTrackPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await props.params
  const { token } = await props.searchParams

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      photos: { orderBy: { createdAt: "asc" } },
      activityLogs: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!ticket) notFound()

  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
  const isClosed = ticket.status === "CLOSED" || ticket.status === "COMPLETED"
  const isAwaitingVerification = ticket.status === "AWAITING_VERIFICATION"
  const isAwaitingCosting = ticket.status === "AWAITING_COSTING"
  const isInProgress = ticket.status === "IN_PROGRESS"
  const isAcknowledged = ticket.status === "ACKNOWLEDGED" || isInProgress || isAwaitingVerification || isAwaitingCosting || isClosed
  const isCancelled = ticket.status === "CANCELLED"
  const isRejected = ticket.status === "REJECTED"

  const hasValidToken = token && ticket.requesterToken === token
  const complaintPhoto = ticket.photos.find((p) => p.category === "INITIAL_COMPLAINT") || (ticket.photoUrl ? { fileUrl: ticket.photoUrl, caption: "Initial complaint photo" } : null)
  const beforePhoto = ticket.photos.find((p) => p.category === "BEFORE")
  const afterPhoto = ticket.photos.find((p) => p.category === "AFTER")

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/public/maintenance/request"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Submit Another Request
          </Link>
          <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
            {formattedLog}
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-blue-500/20 text-blue-300 font-mono text-xs font-bold px-2.5 py-0.5 rounded border border-blue-400/30">
                {formattedLog}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-white/10 text-slate-200">
                {ticket.ticketType}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black">{ticket.title}</h1>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>{ticket.location} {ticket.specificArea ? `• ${ticket.specificArea}` : ""}</span>
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Requester Verification Trigger if Awaiting */}
            {isAwaitingVerification && hasValidToken && (
              <RequesterVerificationCard ticketId={ticket.id} token={token} />
            )}

            {ticket.verifiedByRequester && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Work Confirmed Satisfactory by Requester</span>
                </div>
                {ticket.requesterVerifiedAt && (
                  <span className="text-[11px] text-emerald-700">
                    {new Date(ticket.requesterVerifiedAt).toLocaleDateString("en-GB")}
                  </span>
                )}
              </div>
            )}

            {/* Official Closed Job Sheet Download Card */}
            {isClosed && ticket.jobSheetNumber && (
              <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Official Maintenance Job Sheet &amp; Billing Memo</span>
                  </div>
                  <p className="text-[11px] text-blue-700 font-mono mt-0.5">
                    Ref: {ticket.jobSheetNumber}
                  </p>
                </div>
                <a
                  href={`/api/public/maintenance/jobsheet/${ticket.jobSheetNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            )}

            {/* Status Timeline */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Live Workflow Milestones
              </h2>

              <div className="relative pl-6 space-y-6 border-l-2 border-slate-200">
                {/* Step 1: Request Logged */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Work Request Logged</h3>
                    <p className="text-[11px] text-slate-500">
                      Logged into BubblesO2 maintenance ledger on{" "}
                      {new Date(ticket.createdAt).toLocaleString("en-GB")}.
                    </p>
                  </div>
                </div>

                {/* Step 2: PIC Acknowledged */}
                <div className="relative">
                  <span
                    className={`absolute -left-[31px] top-0 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                      isAcknowledged
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isAcknowledged ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-slate-400" />}
                  </span>
                  <div>
                    <h3 className={`text-xs font-bold ${isAcknowledged ? "text-slate-900" : "text-slate-400"}`}>
                      PIC Acknowledgment &amp; SLA Commitment
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {ticket.acknowledgedAt ? (
                        <>Acknowledged by <strong className="text-slate-700">{ticket.acknowledgedBy?.name || "Maintenance Lead"}</strong> on {new Date(ticket.acknowledgedAt).toLocaleString("en-GB")}.</>
                      ) : (
                        "Pending engineering PIC acknowledgment."
                      )}
                    </p>
                    {ticket.targetDateline && (
                      <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                        Target Completion Deadline: {new Date(ticket.targetDateline).toLocaleString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 3: Technician Repair in Progress */}
                <div className="relative">
                  <span
                    className={`absolute -left-[31px] top-0 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                      isInProgress || isAwaitingVerification || isAwaitingCosting || isClosed
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isAwaitingVerification || isAwaitingCosting || isClosed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isInProgress ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                    )}
                  </span>
                  <div>
                    <h3 className={`text-xs font-bold ${isInProgress || isAwaitingVerification || isClosed ? "text-slate-900" : "text-slate-400"}`}>
                      Technician Execution
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {ticket.assignee?.name || ticket.assigneeName ? (
                        <>Assigned to <strong className="text-slate-700">{ticket.assignee?.name || ticket.assigneeName}</strong>.</>
                      ) : (
                        "Pending technician assignment."
                      )}
                    </p>
                  </div>
                </div>

                {/* Step 4: Work Completion & Resolution */}
                <div className="relative">
                  <span
                    className={`absolute -left-[31px] top-0 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                      isClosed || isAwaitingCosting || isAwaitingVerification
                        ? "bg-emerald-500 text-white"
                        : isCancelled || isRejected
                        ? "bg-red-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isClosed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isCancelled || isRejected ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                    )}
                  </span>
                  <div>
                    <h3 className={`text-xs font-bold ${isClosed ? "text-emerald-700" : isCancelled || isRejected ? "text-red-700" : "text-slate-400"}`}>
                      {isClosed
                        ? "Ticket Closed & Job Sheet Generated"
                        : isAwaitingCosting
                        ? "Work Verified • Finalizing Costs"
                        : isAwaitingVerification
                        ? "Work Completed • Awaiting Verification"
                        : isCancelled
                        ? "Request Cancelled"
                        : isRejected
                        ? "Request Rejected"
                        : "Completion & Final Closure"}
                    </h3>
                    {ticket.workCompletedAt && (
                      <p className="text-[11px] text-slate-500">
                        Work finished on {new Date(ticket.workCompletedAt).toLocaleString("en-GB")}
                        {ticket.kpiRepairHours ? ` (${ticket.kpiRepairHours}h repair time)` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution notes if present */}
            {ticket.resolution && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Technician Resolution &amp; Actions Taken
                </p>
                <p className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {ticket.resolution}
                </p>
              </div>
            )}

            {/* Photographic Evidence Gallery */}
            {(complaintPhoto || beforePhoto || afterPhoto) && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Photographic Evidence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {beforePhoto && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Before Repair
                      </span>
                      <img
                        src={beforePhoto.fileUrl}
                        alt="Before repair"
                        className="w-full h-44 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  {afterPhoto && (
                    <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/50 p-2">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                        After Repair / Restored
                      </span>
                      <img
                        src={afterPhoto.fileUrl}
                        alt="After repair"
                        className="w-full h-44 object-cover rounded-lg border border-emerald-200"
                      />
                    </div>
                  )}
                  {complaintPhoto && !beforePhoto && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Reported Damage Photo
                      </span>
                      <img
                        src={complaintPhoto.fileUrl}
                        alt="Initial damage"
                        className="w-full h-44 object-cover rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requester & Priority Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Requester</span>
                <span className="font-semibold text-slate-900">{ticket.requesterName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Priority</span>
                <span className={`font-bold ${
                  ticket.priority === "URGENT" ? "text-red-600" : ticket.priority === "HIGH" ? "text-orange-600" : "text-blue-600"
                }`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
