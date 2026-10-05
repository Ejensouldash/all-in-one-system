"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  acknowledgeMaintenanceTicket,
  assignMaintenanceTicket,
  updateMaintenanceCosts,
  closeMaintenanceTicket
} from "@/app/actions/maintenance-ticket"
import { 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  UserCheck, 
  DollarSign, 
  Trash2, 
  Plus, 
  MapPin, 
  FileText,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  ShieldCheck,
  Download,
  AlertTriangle,
  UserPlus
} from "lucide-react"
import Link from "next/link"

export function MaintenanceWorkspace({
  ticket,
  staffList = [],
  catalogItems = [],
}: {
  ticket: any
  staffList: any[]
  catalogItems?: any[]
}) {
  const router = useRouter()
  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Acknowledgment State
  const [ackAgree, setAckAgree] = useState(false)
  const [customDeadline, setCustomDeadline] = useState(
    ticket.targetDateline
      ? new Date(ticket.targetDateline).toISOString().slice(0, 16)
      : ""
  )

  // Assignment Modal/Panel State
  const [showAssignPanel, setShowAssignPanel] = useState(false)
  const [assigneeType, setAssigneeType] = useState<"INTERNAL" | "CONTRACTOR">(
    ticket.assigneeId ? "INTERNAL" : ticket.assigneeName ? "CONTRACTOR" : "INTERNAL"
  )
  const [selectedStaffId, setSelectedStaffId] = useState(ticket.assigneeId || "")
  const [contractorName, setContractorName] = useState(ticket.assigneeName || "")
  const [contractorPhone, setContractorPhone] = useState(ticket.contractorPhone || "")
  const [reassignmentReason, setReassignmentReason] = useState("")

  // Costs State
  const [costs, setCosts] = useState<any[]>(
    ticket.costs && ticket.costs.length > 0
      ? ticket.costs.map((c: any) => ({
          category: c.category || "SPARE_PART",
          itemId: c.itemId || "",
          itemName: c.itemName || "",
          quantity: c.quantity || 1,
          unit: c.unit || "PCS",
          unitPrice: c.unitPrice || 0,
          amount: c.amount || 0,
          remarks: c.remarks || "",
        }))
      : []
  )

  // Closure Remarks
  const [closingRemarks, setClosingRemarks] = useState("")

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(label)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  // Cost handlers
  const handleAddCostRow = () => {
    setCosts([
      ...costs,
      {
        category: "SPARE_PART",
        itemId: "",
        itemName: "",
        quantity: 1,
        unit: "PCS",
        unitPrice: 0,
        amount: 0,
        remarks: "",
      },
    ])
  }

  const handlePickCatalogItem = (index: number, itemId: string) => {
    const item = catalogItems.find((c) => c.id === itemId)
    const updated = [...costs]
    if (item) {
      updated[index].itemId = item.id
      updated[index].itemName = `${item.name} (${item.location || 'Warehouse'})`
      updated[index].unit = item.unit || "PCS"
      const unitPrice = typeof item.pricePerUnit === "number" ? item.pricePerUnit : parseFloat(item.pricePerUnit) || 0
      updated[index].unitPrice = unitPrice
      const qty = parseFloat(updated[index].quantity) || 1
      updated[index].amount = Math.round(qty * unitPrice * 100) / 100
    } else {
      updated[index].itemId = ""
    }
    setCosts(updated)
  }

  const handleCostFieldChange = (index: number, field: string, val: any) => {
    const updated = [...costs]
    updated[index][field] = val
    if (field === "quantity" || field === "unitPrice") {
      const q = parseFloat(updated[index].quantity) || 0
      const p = parseFloat(updated[index].unitPrice) || 0
      updated[index].amount = Math.round(q * p * 100) / 100
    }
    setCosts(updated)
  }

  const handleRemoveCostRow = (index: number) => {
    setCosts(costs.filter((_, i) => i !== index))
  }

  const totalCost = costs.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)

  // 1. Submit Acknowledgment
  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.set("agree", ackAgree ? "true" : "false")
    if (customDeadline) formData.set("targetDateline", customDeadline)

    const res = await acknowledgeMaintenanceTicket(ticket.id, formData)
    setIsProcessing(false)

    if (res.success) {
      setStatusMsg({ type: "success", text: "Ticket acknowledged successfully! SLA timer started." })
      setTimeout(() => router.refresh(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to acknowledge ticket." })
    }
  }

  // 2. Submit Assignment
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.set("assigneeType", assigneeType)
    if (assigneeType === "INTERNAL") {
      formData.set("assigneeId", selectedStaffId)
    } else {
      formData.set("assigneeName", contractorName)
      formData.set("contractorPhone", contractorPhone)
    }
    if (reassignmentReason) formData.set("reassignmentReason", reassignmentReason)

    const res = await assignMaintenanceTicket(ticket.id, formData)
    setIsProcessing(false)

    if (res.success) {
      setStatusMsg({ type: "success", text: "Technician/Contractor assigned successfully!" })
      setShowAssignPanel(false)
      setTimeout(() => router.refresh(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to assign." })
    }
  }

  // 3. Save Costs Atomically
  const handleSaveCosts = async () => {
    setIsProcessing(true)
    setStatusMsg(null)

    const res = await updateMaintenanceCosts(ticket.id, costs)
    setIsProcessing(false)

    if (res.success) {
      setStatusMsg({ type: "success", text: "Costs saved atomically in database!" })
      setTimeout(() => router.refresh(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to save costs." })
    }
  }

  // 4. Close Ticket & Generate Job Sheet PDF
  const handleCloseTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.set("closingRemarks", closingRemarks)

    const res = await closeMaintenanceTicket(ticket.id, formData)
    setIsProcessing(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: `Ticket closed successfully! Job sheet ${res.jobSheetNumber} generated.`,
      })
      setTimeout(() => router.refresh(), 1200)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to close ticket." })
    }
  }

  const isClosed = ticket.status === "CLOSED" || ticket.status === "COMPLETED"
  const isAwaitingVerification = ticket.status === "AWAITING_VERIFICATION"
  const isAwaitingCosting = ticket.status === "AWAITING_COSTING"
  const beforePhoto = ticket.photos?.find((p: any) => p.category === "BEFORE")
  const progressPhotos = ticket.photos?.filter((p: any) => p.category === "PROGRESS") || []
  const afterPhoto = ticket.photos?.find((p: any) => p.category === "AFTER")
  const complaintPhoto = ticket.photos?.find((p: any) => p.category === "INITIAL_COMPLAINT") || (ticket.photoUrl ? { fileUrl: ticket.photoUrl } : null)

  const publicTrackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public/maintenance/track/${ticket.id}?token=${ticket.requesterToken}`
    : `/public/maintenance/track/${ticket.id}?token=${ticket.requesterToken}`

  const contractorMagicUrl = ticket.contractorToken && typeof window !== "undefined"
    ? `${window.location.origin}/maintenance/work/${ticket.id}?token=${ticket.contractorToken}`
    : `/maintenance/work/${ticket.id}?token=${ticket.contractorToken}`

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/forms/maintenance/tickets"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Maintenance Ledger
        </Link>

        {/* Quick Links Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {ticket.jobSheetNumber && (
            <a
              href={`/api/public/maintenance/jobsheet/${ticket.jobSheetNumber}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Job Sheet ({ticket.jobSheetNumber})</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => copyToClipboard(publicTrackUrl, "requester")}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            {copiedLink === "requester" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink === "requester" ? "Copied Track Link!" : "Copy Requester Link"}</span>
          </button>

          {ticket.contractorToken && (
            <button
              type="button"
              onClick={() => copyToClipboard(contractorMagicUrl, "contractor")}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              {copiedLink === "contractor" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-orange-600" />}
              <span>{copiedLink === "contractor" ? "Copied Magic Link!" : "Copy Contractor Magic Link"}</span>
            </button>
          )}

          <Link
            href={`/maintenance/work/${ticket.id}`}
            target="_blank"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Open Technician View</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Ticket Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {formattedLog}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                ticket.status === 'CLOSED' || ticket.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : ticket.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : ticket.status === 'AWAITING_VERIFICATION'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : ticket.status === 'AWAITING_COSTING'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {ticket.status.replace("_", " ")}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {ticket.ticketType}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-700'
              }`}>
                Priority: {ticket.priority}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{ticket.title}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{ticket.location} {ticket.specificArea ? `• ${ticket.specificArea}` : ''}</span>
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[240px] space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Requester:</span>
              <span className="font-bold text-slate-800">{ticket.requesterName}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Contact:</span>
              <span className="text-slate-700">{ticket.requesterPhone}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Logged:</span>
              <span className="text-slate-700">{new Date(ticket.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
            {ticket.targetDateline && (
              <div className="flex justify-between text-blue-700 font-semibold pt-1 border-t border-slate-200">
                <span>Target:</span>
                <span>{new Date(ticket.targetDateline).toLocaleDateString("en-GB")}</span>
              </div>
            )}
          </div>
        </div>

        {ticket.reasonOfWork && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-0.5">Reported Symptoms</span>
            {ticket.reasonOfWork}
          </div>
        )}
      </div>

      {/* GATE 1: PIC Formal Acknowledgment (If still OPEN) */}
      {ticket.status === "OPEN" && (
        <form onSubmit={handleAcknowledge} className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-950">Action Required: Acknowledge Ticket &amp; Set SLA Target</h3>
              <p className="text-xs text-amber-900 mt-0.5">
                As the designated PIC for {ticket.ticketType}, please review this request, accept supervisory accountability, and confirm the repair deadline.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Completion Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={customDeadline}
                onChange={(e) => setCustomDeadline(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Default for {ticket.priority}: {ticket.priority === 'URGENT' ? '24 Hours' : ticket.priority === 'HIGH' ? '3 Days' : '7 Days'} from acknowledgment.
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/80 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={ackAgree}
                  onChange={(e) => setAckAgree(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 mt-0.5"
                />
                <span className="text-xs text-slate-800 leading-snug font-medium">
                  I formally acknowledge receipt of this work request and assume supervisory responsibility for the repair execution.
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || !ackAgree}
            className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Formally Acknowledge Ticket</span>
          </button>
        </form>
      )}

      {/* GATE 2: Technician & Contractor Assignment */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Technician / Contractor Assignment
            </h3>
          </div>
          {!isClosed && (
            <button
              type="button"
              onClick={() => setShowAssignPanel(!showAssignPanel)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{ticket.assigneeId || ticket.assigneeName ? "Reassign" : "Assign Technician"}</span>
            </button>
          )}
        </div>

        {/* Current Assignee Display */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-bold block">Assigned Worker</span>
            <span className="font-bold text-slate-900 text-sm">
              {ticket.assignee?.name || ticket.assigneeName || "Unassigned"}
            </span>
            {ticket.contractorPhone && (
              <span className="text-slate-500 block text-[11px]">Phone: {ticket.contractorPhone}</span>
            )}
          </div>
          {ticket.acknowledgedBy && (
            <div className="text-left sm:text-right">
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Supervising PIC</span>
              <span className="font-semibold text-slate-800">{ticket.acknowledgedBy.name}</span>
            </div>
          )}
        </div>

        {/* Expandable Assign Form */}
        {showAssignPanel && (
          <form onSubmit={handleAssign} className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="radio"
                  name="assignTypeRadio"
                  checked={assigneeType === "INTERNAL"}
                  onChange={() => setAssigneeType("INTERNAL")}
                  className="text-blue-600"
                />
                <span>Internal Staff Technician</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="radio"
                  name="assignTypeRadio"
                  checked={assigneeType === "CONTRACTOR"}
                  onChange={() => setAssigneeType("CONTRACTOR")}
                  className="text-blue-600"
                />
                <span>External Contractor / Vendor</span>
              </label>
            </div>

            {assigneeType === "INTERNAL" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Choose technician --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.unit?.name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contractor / Firm Name</label>
                  <input
                    type="text"
                    required
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="e.g. Pro-Chill Engineering / Akmal Vendor"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contractor Phone (For Magic Link)</label>
                  <input
                    type="tel"
                    value={contractorPhone}
                    onChange={(e) => setContractorPhone(e.target.value)}
                    placeholder="e.g. 019-8765432"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assignment / Handover Note (Optional)</label>
              <input
                type="text"
                value={reassignmentReason}
                onChange={(e) => setReassignmentReason(e.target.value)}
                placeholder="Specific instructions or tool requirements..."
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Confirm Assignment</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAssignPanel(false)}
                className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* GATE 3: Evidence & Work Progress Gallery */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Photographic Evidence &amp; Resolution
          </h3>
          <span className="text-xs text-slate-500">
            Total Photos: {ticket.photos?.length || 0}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">1. Complaint Photo</span>
            {complaintPhoto ? (
              <img src={complaintPhoto.fileUrl} alt="Complaint" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
            ) : (
              <div className="h-36 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                No complaint photo
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">2. Before Repair</span>
            {beforePhoto ? (
              <img src={beforePhoto.fileUrl} alt="Before" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
            ) : (
              <div className="h-36 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                Pending technician before photo
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">3. In-Progress Repair</span>
              {progressPhotos.length > 0 && (
                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {progressPhotos.length} {progressPhotos.length === 1 ? "photo" : "photos"}
                </span>
              )}
            </div>
            {progressPhotos.length > 0 ? (
              <img src={progressPhotos[0].fileUrl} alt="In-Progress" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
            ) : (
              <div className="h-36 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                No progress photo
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">4. After Repair / Restored</span>
            {afterPhoto ? (
              <img src={afterPhoto.fileUrl} alt="After" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
            ) : (
              <div className="h-36 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                Pending technician after photo
              </div>
            )}
          </div>
        </div>

        {/* If multiple progress photos exist, display additional snapshots */}
        {progressPhotos.length > 1 && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Additional In-Progress Snapshots ({progressPhotos.length} total):
            </span>
            <div className="flex flex-wrap gap-2.5">
              {progressPhotos.slice(1).map((p: any, idx: number) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={p.fileUrl} alt={`Progress ${idx + 2}`} className="w-full h-full object-cover" />
                  {p.caption && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] px-1 truncate text-center">
                      {p.caption}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {ticket.noPhotoReason && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            <strong>Photo Exemption:</strong> {ticket.noPhotoReason}
          </div>
        )}

        {ticket.resolution && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Technical Resolution</span>
            <p className="text-xs text-slate-900 whitespace-pre-wrap">{ticket.resolution}</p>
          </div>
        )}
      </div>

      {/* GATE 4: Atomic Costing (Parts, Materials & Labour) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Spare Parts &amp; Maintenance Costing
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Record inventory spare parts used, labor hours, and contractor billing.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/forms/maintenance/purchase-requests?create=true&ticketId=${ticket.id}`}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Raise Purchase Requisition for new parts or external contractor"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Raise PR</span>
            </Link>
            {!isClosed && (
              <button
                type="button"
                onClick={handleAddCostRow}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Cost Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Linked PRs Banner if any */}
        {ticket.purchaseRequests && ticket.purchaseRequests.length > 0 && (
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-blue-900">Linked Purchase Requests:</span>
              <div className="flex flex-wrap gap-1.5">
                {ticket.purchaseRequests.map((pr: any) => (
                  <Link
                    key={pr.id}
                    href={`/forms/maintenance/purchase-requests?search=${pr.prNumber}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-100 rounded-lg border border-blue-300 text-blue-800 font-bold transition-colors"
                  >
                    <span>{pr.prNumber}</span>
                    <span className="text-[10px] font-semibold text-slate-500">({pr.status})</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href="/forms/maintenance/purchase-requests"
              className="text-blue-700 hover:underline font-bold text-[11px] flex items-center gap-1"
            >
              <span>View PR Ledger</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Cost Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Catalog Item / Description</th>
                <th className="py-2.5 px-3 w-20">Qty</th>
                <th className="py-2.5 px-3 w-20">Unit</th>
                <th className="py-2.5 px-3 w-28 text-right">Price (RM)</th>
                <th className="py-2.5 px-3 w-28 text-right">Total (RM)</th>
                {!isClosed && <th className="py-2.5 px-2 w-10 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {costs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No chargeable items recorded. Click "Add Cost Item" to add parts or contractor charges.
                  </td>
                </tr>
              ) : (
                costs.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      {isClosed ? (
                        <span>{c.category}</span>
                      ) : (
                        <select
                          value={c.category}
                          onChange={(e) => handleCostFieldChange(i, "category", e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="SPARE_PART">Spare Part</option>
                          <option value="LABOUR">Labour</option>
                          <option value="CONTRACTOR">Contractor</option>
                          <option value="OTHER">Other</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-3 space-y-1">
                      {isClosed ? (
                        <span className="font-semibold text-slate-800">{c.itemName}</span>
                      ) : (
                        <>
                          {c.category === "SPARE_PART" && catalogItems.length > 0 && (
                            <select
                              value={c.itemId || ""}
                              onChange={(e) => handlePickCatalogItem(i, e.target.value)}
                              className="w-full p-1 rounded border border-slate-200 text-[11px] text-slate-600 bg-slate-50 mb-1"
                            >
                              <option value="">-- Pick from Spare Parts Catalog --</option>
                              {catalogItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({item.location || 'Pedas'}) — Stock: {item.quantity} {item.unit} @ RM {Number(item.pricePerUnit || 0).toFixed(2)}
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            value={c.itemName}
                            onChange={(e) => handleCostFieldChange(i, "itemName", e.target.value)}
                            placeholder="Item name / repair charge"
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {isClosed ? (
                        <span>{c.quantity}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          value={c.quantity}
                          onChange={(e) => handleCostFieldChange(i, "quantity", e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs text-center"
                        />
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {isClosed ? (
                        <span>{c.unit}</span>
                      ) : (
                        <input
                          type="text"
                          value={c.unit}
                          onChange={(e) => handleCostFieldChange(i, "unit", e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs text-center"
                        />
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isClosed ? (
                        <span>{parseFloat(c.unitPrice).toFixed(2)}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={c.unitPrice}
                          onChange={(e) => handleCostFieldChange(i, "unitPrice", e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs text-right"
                        />
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      RM {parseFloat(c.amount || 0).toFixed(2)}
                    </td>
                    {!isClosed && (
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCostRow(i)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td colSpan={5} className="py-3 px-3 text-right text-slate-700">
                  TOTAL MAINTENANCE COST:
                </td>
                <td className="py-3 px-3 text-right text-blue-700 text-sm">
                  RM {totalCost.toFixed(2)}
                </td>
                {!isClosed && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {!isClosed && (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveCosts}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Save Costs Atomically</span>
            </button>
          </div>
        )}
      </div>

      {/* GATE 5: Formal Closure & Job Sheet PDF Generation */}
      {!isClosed && (
        <form onSubmit={handleCloseTicket} className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black">HOD / Lead Final Approval &amp; Job Sheet Generation</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Approving closure will lock the ticket, generate the official Job Sheet &amp; Billing Memo PDF, and store it in Cloudflare R2.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Closure Remarks / Supervisor Sign-off Notes
            </label>
            <input
              type="text"
              value={closingRemarks}
              onChange={(e) => setClosingRemarks(e.target.value)}
              placeholder="e.g. Work inspected, machine running satisfactorily in production, approved."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Approve, Close Ticket &amp; Issue Job Sheet PDF</span>
          </button>
        </form>
      )}

      {/* Activity Log Audit Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
          Immutable Audit Log Timeline
        </h3>
        <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 text-xs">
          {ticket.activityLogs?.map((log: any) => (
            <div key={log.id} className="relative">
              <span className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full bg-slate-300 border-2 border-white" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.action.replace("_", " ")}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{log.details}</p>
                <span className="text-[10px] text-slate-400">By: {log.actorName} ({log.actorRole})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
