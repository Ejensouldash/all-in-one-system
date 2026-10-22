"use client"

import { 
  X, 
  Wrench, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  FileText, 
  DollarSign, 
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone
} from "lucide-react"

export function MaintenanceTicketViewModal({
  ticket,
  canManage,
  onClose,
}: {
  ticket: any
  canManage: boolean
  onClose: () => void
}) {
  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200 z-10 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500/20 text-blue-300 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-blue-400/30">
                {formattedLog}
              </span>
              {ticket.legacyProjectId && (
                <span className="bg-amber-500/20 text-amber-300 font-mono text-xs px-2 py-0.5 rounded border border-amber-400/30">
                  Ref: {ticket.legacyProjectId}
                </span>
              )}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-300 border border-slate-600">
                {ticket.ticketType}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white leading-snug">{ticket.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Status & Priority Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-400">Status:</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  ticket.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : ticket.status === "IN_PROGRESS"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : ticket.status === "CANCELLED"
                    ? "bg-gray-200 text-gray-700 border border-gray-300"
                    : ticket.status === "REJECTED"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {ticket.status === "COMPLETED" && <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                {ticket.status === "IN_PROGRESS" && <Clock className="mr-1.5 h-3.5 w-3.5" />}
                {ticket.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-400">Priority:</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800">
                {ticket.priority}
              </span>
            </div>

            {ticket.kpiStatus && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-400">KPI:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  ticket.kpiStatus === "Delay" 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {ticket.kpiStatus} {ticket.kpiDays !== null && ticket.kpiDays !== 0 ? `(${ticket.kpiDays > 0 ? `+${ticket.kpiDays}` : ticket.kpiDays} days)` : ""}
                </span>
              </div>
            )}
          </div>

          {/* Description & Justification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                Work Description
              </h3>
              <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{ticket.title}</p>
            </div>

            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Reason / Justification
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {ticket.reasonOfWork || "No specific reason provided."}
              </p>
            </div>
          </div>

          {/* Attached Document / Memo */}
          {ticket.requestPdfUrl && (
            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    Attached Document / Work Memo
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {ticket.requestPdfName || "Intake Work Request Memo.pdf"}
                  </p>
                </div>
              </div>
              <a
                href={ticket.requestPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View PDF</span>
              </a>
            </div>
          )}

          {/* Location & Requester Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <MapPin className="h-4 w-4" />
                Location
              </div>
              <p className="text-sm font-bold text-slate-900">{ticket.location}</p>
              {ticket.specificArea && (
                <p className="text-xs text-slate-500 mt-1 font-medium">Area: {ticket.specificArea}</p>
              )}
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <UserCheck className="h-4 w-4" />
                Requester
              </div>
              <p className="text-sm font-bold text-slate-900">{ticket.requesterName}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                {ticket.requesterPhone && (
                  <span className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" /> {ticket.requesterPhone}
                  </span>
                )}
                {ticket.requesterEmail && (
                  <span className="truncate">{ticket.requesterEmail}</span>
                )}
              </div>
            </div>
          </div>

          {/* Site/Item Photos if attached */}
          {(() => {
            const complaintPhotos = ticket.photos?.filter((p: any) => p.category === "INITIAL_COMPLAINT") || []
            const displayPhotos = complaintPhotos.length > 0
              ? complaintPhotos
              : (ticket.photoUrl ? [{ fileUrl: ticket.photoUrl }] : [])

            if (displayPhotos.length === 0) return null

            return (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                  <ImageIcon className="h-4 w-4 mr-1.5 text-blue-500" />
                  Site/Item Photos ({displayPhotos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {displayPhotos.map((p: any, idx: number) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                      <img 
                        src={p.fileUrl} 
                        alt={`Site/Item Photo ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <a 
                        href={p.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute bottom-1.5 right-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Schedule & PIC */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-1.5 text-indigo-500" />
              Schedule &amp; Execution (SOP QR02)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Assigned PIC</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {ticket.assignee?.name || ticket.assigneeName || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Target Start</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {ticket.targetStartDate ? new Date(ticket.targetStartDate).toLocaleDateString("en-GB") : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Target Dateline</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {ticket.targetDateline ? new Date(ticket.targetDateline).toLocaleDateString("en-GB") : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Completed Date</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                  {ticket.completedAt ? new Date(ticket.completedAt).toLocaleDateString("en-GB") : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Root Cause & Resolution */}
          {(ticket.rootCause || ticket.resolution) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ticket.rootCause && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <p className="text-xs font-bold uppercase text-amber-800 mb-1">Root Cause Analysis</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{ticket.rootCause}</p>
                </div>
              )}
              {ticket.resolution && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold uppercase text-emerald-800 mb-1">Resolution Actions</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{ticket.resolution}</p>
                </div>
              )}
            </div>
          )}

          {/* Costs (1st Tier / Management Only) */}
          {canManage && ticket.costs && ticket.costs.length > 0 && (
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-emerald-600" />
                Material &amp; Repair Costs
              </h3>
              <div className="divide-y divide-slate-100">
                {ticket.costs.map((c: any) => (
                  <div key={c.id} className="py-1.5 flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{c.itemName}</span>
                    <span className="font-mono font-bold text-slate-900">RM {c.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between text-xs font-bold text-emerald-800">
                  <span>Total Cost</span>
                  <span className="font-mono">
                    RM {ticket.costs.reduce((acc: number, cur: any) => acc + cur.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-400">
            Created: {new Date(ticket.createdAt).toLocaleString("en-GB")}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>
            {canManage && (
              <a
                href={`/forms/maintenance/tickets/${ticket.id}`}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Wrench className="h-3.5 w-3.5" />
                Open Workspace
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
