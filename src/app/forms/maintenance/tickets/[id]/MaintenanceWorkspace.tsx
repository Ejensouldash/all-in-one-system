"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateMaintenanceTicket } from "@/app/actions/maintenance-ticket"
import { 
  Wrench, 
  Save, 
  Loader2, 
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
  ShieldCheck,
  Building,
  Zap,
  Cog,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

export function MaintenanceWorkspace({
  ticket,
  staffList,
  catalogItems = [],
}: {
  ticket: any
  staffList: any[]
  catalogItems?: any[]
}) {
  const router = useRouter()
  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const [status, setStatus] = useState(ticket.status || "OPEN")
  const [priority, setPriority] = useState(ticket.priority || "MEDIUM")
  const [ticketType, setTicketType] = useState(ticket.ticketType || "MECHANICAL")
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId || "")
  const [assigneeName, setAssigneeName] = useState(ticket.assigneeName || "")

  const [targetStartDate, setTargetStartDate] = useState(
    ticket.targetStartDate ? new Date(ticket.targetStartDate).toISOString().split("T")[0] : ""
  )
  const [targetDateline, setTargetDateline] = useState(
    ticket.targetDateline ? new Date(ticket.targetDateline).toISOString().split("T")[0] : ""
  )
  const [completedAt, setCompletedAt] = useState(
    ticket.completedAt ? new Date(ticket.completedAt).toISOString().split("T")[0] : ""
  )

  const [costs, setCosts] = useState<{ itemName: string; amount: number }[]>(
    ticket.costs ? ticket.costs.map((c: any) => ({ itemName: c.itemName, amount: c.amount })) : []
  )

  const handleAddCatalogItem = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itemId = e.target.value
    if (!itemId) return
    const item = catalogItems.find((c) => c.id === itemId)
    if (item) {
      setCosts([...costs, { itemName: `${item.name} (${item.location})`, amount: 0 }])
    }
    e.target.value = ""
  }

  const handleAddCustomCost = () => {
    setCosts([...costs, { itemName: "", amount: 0 }])
  }

  const handleRemoveCost = (index: number) => {
    setCosts(costs.filter((_, i) => i !== index))
  }

  const handleCostChange = (index: number, field: "itemName" | "amount", value: any) => {
    const updated = [...costs]
    if (field === "amount") {
      updated[index].amount = parseFloat(value) || 0
    } else {
      updated[index].itemName = value
    }
    setCosts(updated)
  }

  const totalCost = costs.reduce((acc, c) => acc + (c.amount || 0), 0)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setStatusMsg(null)

    const formData = new FormData(e.currentTarget)
    formData.set("costsData", JSON.stringify(costs))

    const res = await updateMaintenanceTicket(ticket.id, formData)
    setIsSaving(false)

    if (res.success) {
      setStatusMsg({ type: "success", text: "Ticket details updated successfully!" })
      setTimeout(() => {
        router.push("/forms/maintenance/tickets")
        router.refresh()
      }, 1200)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to update ticket." })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/forms/maintenance/tickets"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Work Requests
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500">{formattedLog}</span>
          {ticket.legacyProjectId && (
            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Ref: {ticket.legacyProjectId}
            </span>
          )}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-500/20 text-blue-300 font-mono font-bold text-xs px-2.5 py-1 rounded border border-blue-400/30">
                {formattedLog}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                MAINTENANCE RESOLUTION WORKSPACE
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">{ticket.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Location: {ticket.location} {ticket.specificArea ? `(${ticket.specificArea})` : ""} • Requester: {ticket.requesterName}
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            SOP BOSB-PFMD-850-001
          </span>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {statusMsg && (
            <div
              className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                statusMsg.type === "success"
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                  : "bg-red-950/60 text-red-300 border-red-800"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              {statusMsg.text}
            </div>
          )}

          {/* Section 1: Core Lifecycle Controls */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-400" />
              1. Ticket Status &amp; Assignment
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <select
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="OPEN">Open (New Request)</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  name="ticketType"
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="MECHANICAL">Mechanical</option>
                  <option value="CIVIL">Civil &amp; Facility</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="OTHERS">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <select
                  name="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="LOW">Low (&gt;14 days)</option>
                  <option value="MEDIUM">Medium (7-14 days)</option>
                  <option value="HIGH">High (&lt;3 days)</option>
                  <option value="URGENT">Urgent (&lt;24 hours)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned PIC</label>
                <select
                  name="assigneeId"
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value)
                    const found = staffList.find((s) => s.id === e.target.value)
                    if (found) setAssigneeName(found.name)
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} {staff.unit?.name ? `(${staff.unit.name})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="assigneeName"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Or enter contractor name..."
                  className="mt-1 w-full bg-slate-800/60 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Schedule & Target Datelines (SOP QR02) */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-1.5 text-indigo-400" />
              2. Schedule &amp; KPI Datelines (SOP QR02 Tracker)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Start Date</label>
                <input
                  type="date"
                  name="targetStartDate"
                  value={targetStartDate}
                  onChange={(e) => setTargetStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Dateline (Due Date)</label>
                <input
                  type="date"
                  name="targetDateline"
                  value={targetDateline}
                  onChange={(e) => setTargetDateline(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Actual Completed Date</label>
                <input
                  type="date"
                  name="completedAt"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Root Cause & Resolution */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
              <FileText className="h-4 w-4 mr-1.5 text-amber-400" />
              3. Root Cause Analysis &amp; Corrective Resolution
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Root Cause Analysis (RCA)</label>
                <textarea
                  name="rootCause"
                  defaultValue={ticket.rootCause || ""}
                  rows={4}
                  placeholder="What was the technical cause of the breakdown or fault?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resolution &amp; Corrective Steps</label>
                <textarea
                  name="resolution"
                  defaultValue={ticket.resolution || ""}
                  rows={4}
                  placeholder="Describe maintenance actions taken, replaced components, tests performed..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Verification & Handover */}
          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
              <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-400" />
              4. Verification &amp; Plant Handover
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Verified By (Maintenance Lead)</label>
                <input
                  type="text"
                  name="verifiedBy"
                  defaultValue={ticket.verifiedBy || ""}
                  placeholder="e.g. En Ridzuan / En Akmal"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Handover Acknowledgment</label>
                <input
                  type="text"
                  name="handover"
                  defaultValue={ticket.handover || ""}
                  placeholder="e.g. Handed over to Production Shift Lead"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Spare Parts & Material Costs */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-emerald-400" />
                5. Spare Parts &amp; Repair Expenses
              </h2>
              <div className="flex items-center gap-2">
                <select
                  onChange={handleAddCatalogItem}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">+ Pick from Maintenance Inventory...</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomCost}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Custom Item
                </button>
              </div>
            </div>

            {costs.length > 0 ? (
              <div className="bg-slate-800/60 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Item Description</th>
                      <th className="px-4 py-2.5 w-36">Cost (RM)</th>
                      <th className="px-4 py-2.5 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {costs.map((c, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={c.itemName}
                            onChange={(e) => handleCostChange(i, "itemName", e.target.value)}
                            placeholder="Part / Service description..."
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={c.amount}
                            onChange={(e) => handleCostChange(i, "amount", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-right font-mono text-emerald-400 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCost(i)}
                            className="p-1 text-rose-400 hover:text-rose-200 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-800/80 font-bold text-xs text-white">
                    <tr>
                      <td className="px-4 py-2.5 text-right uppercase text-slate-400">Total Material Cost:</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                        RM {totalCost.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No spare parts or material expenses logged for this ticket.</p>
            )}
          </div>

          {/* Damage Photo preview if exists */}
          {ticket.photoUrl && (
            <div className="pt-6 border-t border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Attached Photo (Cloudflare R2)
              </h2>
              <div className="flex items-center gap-3">
                <img
                  src={ticket.photoUrl}
                  alt="Damage photo"
                  className="h-24 w-32 object-cover rounded-lg border border-slate-700"
                />
                <a
                  href={ticket.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View Full Resolution
                </a>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <Link
              href="/forms/maintenance/tickets"
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Updates...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
