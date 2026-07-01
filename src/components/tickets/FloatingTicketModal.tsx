"use client"

import { useState, useEffect, useRef } from "react"
import { createTicket, getTicketModalData, getAssetByTag } from "@/app/actions/ticket"
import { Plus, X, Laptop, Send, Loader2, AlertCircle, Ticket, CheckCircle2, Search, Cpu } from "lucide-react"

export function FloatingTicketModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [data, setData] = useState<{ user: any, branches: any[] } | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState("")

  // Asset Search State
  const [assetTag, setAssetTag] = useState("")
  const [foundAsset, setFoundAsset] = useState<any>(null)
  const [isSearchingAsset, setIsSearchingAsset] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && !data) {
      setIsLoadingData(true)
      getTicketModalData().then(res => {
        setData(res)
        setIsLoadingData(false)
        if (res?.user?.unit?.branchId) {
          setSelectedBranchId(res.user.unit.branchId)
          setSelectedUnitId(res.user.unitId || "")
        }
      })
    }
  }, [isOpen, data])

  // Real-time asset search
  useEffect(() => {
    if (!assetTag || assetTag.trim() === "") {
      setFoundAsset(null)
      setIsSearchingAsset(false)
      return
    }

    setIsSearchingAsset(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    searchTimeoutRef.current = setTimeout(async () => {
      const asset = await getAssetByTag(assetTag)
      setFoundAsset(asset)
      setIsSearchingAsset(false)
    }, 500) // Debounce for 500ms

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [assetTag])

  // Allow other components to trigger the modal
  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('open-ticket-modal', handleOpen)
    return () => window.removeEventListener('open-ticket-modal', handleOpen)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMsg(null)
    
    const formData = new FormData(e.currentTarget)

    const res = await createTicket(formData)
    
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Ticket successfully submitted! The IT team will review it shortly.' })
      setTimeout(() => {
        setIsOpen(false)
        setStatusMsg(null)
      }, 2000)
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'An error occurred.' })
    }
    setIsSubmitting(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[5.5rem] right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-110 group flex items-center justify-center"
      >
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
          
          <div className="relative bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative flex-shrink-0">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold flex items-center">
                <Ticket className="h-5 w-5 mr-2" />
                Submit IT Ticket
              </h2>
              <p className="text-blue-100 text-sm mt-1">Please provide details about the issue.</p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingData ? (
                <div className="flex flex-col justify-center items-center h-40 space-y-3">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 font-medium">Loading profile...</p>
                </div>
              ) : data ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {statusMsg && (
                    <div className={`p-3 rounded-xl text-sm font-medium flex items-start border ${
                      statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5" /> : <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />}
                      {statusMsg.text}
                    </div>
                  )}

                  {/* Requester Section */}
                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Requester Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Your Full Name <span className="text-red-500">*</span></label>
                        <input type="text" name="requesterName" required placeholder="John Doe" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <input type="tel" name="phone" required placeholder="012-3456789" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Department Info */}
                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Login Account</label>
                      <input type="text" readOnly value={data?.user.email || ""} className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-gray-900 focus:ring-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Branch <span className="text-red-500">*</span></label>
                        <select 
                          value={selectedBranchId}
                          onChange={(e) => {
                            setSelectedBranchId(e.target.value)
                            setSelectedUnitId("")
                          }}
                          required
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        >
                          <option value="">Select Branch</option>
                          {data?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit / Dept <span className="text-red-500">*</span></label>
                        <select 
                          name="unitId"
                          value={selectedUnitId}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          required
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        >
                          <option value="">Select Unit</option>
                          {data?.branches.find(b => b.id === selectedBranchId)?.units?.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Asset Details */}
                  <div className="grid grid-cols-2 gap-4 relative">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Asset Tag No.</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          name="assetNumber" 
                          value={assetTag}
                          onChange={(e) => setAssetTag(e.target.value)}
                          placeholder="e.g. LPT-001" 
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400">
                          {isSearchingAsset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Asset Type</label>
                      <select name="assetType" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
                        <option value="">(Select if applicable)</option>
                        <option value="Laptop/PC">Laptop / PC</option>
                        <option value="Printer">Printer</option>
                        <option value="Network">Network / Wi-Fi</option>
                        <option value="System/Software">System / Software</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Real-time Asset Card overlay */}
                    {foundAsset && (
                      <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start animate-in slide-in-from-top-2 duration-300">
                        <Cpu className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-blue-900">{foundAsset.category}: {foundAsset.brand} {foundAsset.model}</p>
                          <p className="text-xs text-blue-700">Serial: {foundAsset.serialNumber || 'N/A'}</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto flex-shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Issue Details */}
                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mt-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Issue Details</h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                          <input type="text" name="location" required placeholder="e.g. Production Form, Office..." className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Priority <span className="text-red-500">*</span></label>
                          <select name="priority" required className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
                            <option value="User Feedback">User Feedback</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                        <input type="text" name="title" required placeholder="e.g. Cannot connect to Wi-Fi" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Detailed Description <span className="text-red-500">*</span></label>
                        <textarea name="description" required rows={3} placeholder="Please explain what happened in detail..." className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 flex gap-3 pb-2">
                    <button 
                      type="button" 
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-[2] px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Ticket
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 text-red-500 text-center">Failed to load profile data.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
