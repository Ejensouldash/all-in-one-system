"use client"

import { useState } from "react"
import { updateTicket } from "@/app/actions/ticket"
import { Save, AlertCircle, CheckCircle2, UserCheck, Wrench, NotebookPen, ArrowLeft, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function ITWorkspace({ ticket, itStaffList, costCatalog = [] }: { ticket: any, itStaffList: any[], costCatalog?: any[] }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  
  const [ticketType, setTicketType] = useState(ticket.type || "")
  const [costs, setCosts] = useState<{itemName: string, amount: number}[]>(
    ticket.costs ? ticket.costs.map((c: any) => ({ itemName: c.itemName, amount: c.amount })) : []
  )

  const handleAddCost = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (!val) return
    const item = costCatalog.find(c => c.id === val)
    if (item) {
      setCosts([...costs, { itemName: item.itemName, amount: item.defaultCost }])
    }
    e.target.value = "" // reset select
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setStatusMsg(null)

    const formData = new FormData(e.currentTarget)
    const res = await updateTicket(ticket.id, formData)

    if (res.success) {
      setShowSuccessOverlay(true)
      setTimeout(() => {
        router.push("/tickets")
      }, 1500)
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update ticket.' })
    }
    setIsSaving(false)
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-blue-400" /> 
          IT Resolution Workspace
        </h2>
        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-400/30">ADMIN ONLY</span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <input type="hidden" name="costsData" value={JSON.stringify(costs)} />
        
        {/* Core Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Status
            </label>
            <select name="status" defaultValue={ticket.status} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" /> Priority
            </label>
            <select name="priority" defaultValue={ticket.priority} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="User Feedback - Low">User Feedback - Low</option>
              <option value="User Feedback - Medium">User Feedback - Medium</option>
              <option value="User Feedback - High">User Feedback - High</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
              <UserCheck className="h-3 w-3 mr-1" /> Assign To
            </label>
            <select name="assigneeId" defaultValue={ticket.assigneeId || ""} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Unassigned</option>
              {itStaffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ticket Type
            </label>
            <select 
              name="type" 
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Type</option>
              <option value="Infra">Infra (Network/Hardware)</option>
              <option value="System">System & Server</option>
              <option value="M365">M365 / Emails</option>
              <option value="Application">Business Applications</option>
              <option value="Event">Event Support</option>
              <option value="Support">General Support</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {ticketType === "Others" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Specify Other Type
              </label>
              <input 
                type="text" 
                name="typeOthers" 
                defaultValue={ticket.typeOthers || ""}
                placeholder="Please specify..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* RCA & Resolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Root Cause Analysis (RCA)
            </label>
            <textarea 
              name="rootCause" 
              defaultValue={ticket.rootCause || ""} 
              placeholder="What was the actual cause of the problem?"
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-gray-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Resolution Steps
            </label>
            <textarea 
              name="resolution" 
              defaultValue={ticket.resolution || ""} 
              placeholder="What steps were taken to resolve it?"
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-gray-600"
            />
          </div>
        </div>

        {/* Cost Tracking */}
        <div className="pt-4 border-t border-gray-800 space-y-3">
          <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center">
            Ticket Costs & Expenses
          </label>
          <div className="flex gap-2">
            <select 
              onChange={handleAddCost}
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">+ Add Item from Catalog...</option>
              {costCatalog.map(c => (
                <option key={c.id} value={c.id}>{c.itemName} (RM {c.defaultCost.toFixed(2)})</option>
              ))}
            </select>
          </div>
          {costs.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden mt-2">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2 w-32">Amount (RM)</th>
                    <th className="px-4 py-2 w-16 text-center">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((c, i) => (
                    <tr key={i} className="border-t border-gray-700/50">
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={c.itemName} 
                          onChange={(e) => {
                            const newCosts = [...costs]; newCosts[i].itemName = e.target.value; setCosts(newCosts);
                          }}
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-white" 
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={c.amount} 
                          step="0.01"
                          onChange={(e) => {
                            const newCosts = [...costs]; newCosts[i].amount = parseFloat(e.target.value) || 0; setCosts(newCosts);
                          }}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 outline-none focus:border-emerald-500 text-white" 
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => setCosts(costs.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                          <X className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-800/80 font-bold border-t border-gray-700">
                    <td className="px-4 py-3 text-right text-emerald-400">Total Cost:</td>
                    <td className="px-4 py-3 text-emerald-400">RM {costs.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Internal Notes */}
        <div className="pt-4 border-t border-gray-800 space-y-1">
          <label className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider flex items-center">
            <NotebookPen className="h-3 w-3 mr-1" /> Internal IT Notes (Hidden from user)
          </label>
          <textarea 
            name="internalNotes" 
            defaultValue={ticket.internalNotes || ""} 
            placeholder="Private notes for the IT team..."
            rows={2}
            className="w-full bg-amber-900/20 border border-amber-900/50 text-amber-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none placeholder-amber-900/50"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <div>
            {statusMsg && (
              <span className={`text-sm font-medium flex items-center ${statusMsg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {statusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                {statusMsg.text}
              </span>
            )}
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] flex items-center disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Update Ticket"}
          </button>
        </div>

      </form>

      {/* Success Overlay Animation */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl animate-in zoom-in-50 duration-300">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_1]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Update Successful!</h2>
            <p className="text-gray-500 mt-2 text-sm flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1 animate-pulse" /> Returning to tickets...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
