"use client"

import { useState } from "react"
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  MessageSquare,
  User,
  Phone,
  AtSign,
  Share2,
  ShieldAlert,
  CheckCircle,
} from "lucide-react"
import { ManualComplaintPriority, ManualComplaintStatus } from "@prisma/client"
import { createManualComplaint } from "@/app/actions/manual-complaints"
import { useRouter } from "next/navigation"

interface ManualComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const MANUAL_PLATFORM_OPTIONS = [
  "Threads",
  "Instagram",
  "Tiktok",
  "Customer Careline",
  "MS Forms",
  "Email",
  "X",
  "Other (Please Specify)",
]

export const MANUAL_PIC_OPTIONS = [
  "Zara - Customer Careline",
  "Azizan - Threads",
  "Faiz - Threads",
  "Jiha - Tiktok",
]

export function ManualComplaintModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualComplaintModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [customerName, setCustomerName] = useState("")
  const [customerNumber, setCustomerNumber] = useState("")
  const [customerSocials, setCustomerSocials] = useState("")
  const [customerPlatform, setCustomerPlatform] = useState("Threads")
  const [customPlatform, setCustomPlatform] = useState("")
  const [priority, setPriority] = useState<ManualComplaintPriority>(ManualComplaintPriority.YELLOW)
  const [status, setStatus] = useState<ManualComplaintStatus>(ManualComplaintStatus.OPEN)
  const [picHandling, setPicHandling] = useState("Zara - Customer Careline")
  const [customPic, setCustomPic] = useState("")
  const [mainComplaint, setMainComplaint] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!customerName.trim()) {
      setError("Customer Name is required.")
      return
    }
    if (!customerNumber.trim()) {
      setError("Customer Phone/Number is required.")
      return
    }
    if (!mainComplaint.trim()) {
      setError("Main Complaint body text is required.")
      return
    }

    if (customerPlatform === "Other (Please Specify)" && !customPlatform.trim()) {
      setError("Please specify the Customer Platform.")
      return
    }

    const platformToSave =
      customerPlatform === "Other (Please Specify)"
        ? customPlatform.trim()
        : customerPlatform

    const picToSave =
      picHandling === "Other" && customPic.trim()
        ? customPic.trim()
        : picHandling

    setIsSubmitting(true)

    try {
      const res = await createManualComplaint({
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        customerSocials: customerSocials.trim() || undefined,
        customerPlatform: platformToSave,
        mainComplaint: mainComplaint.trim(),
        priority,
        status,
        picHandling: picToSave,
        resolutionNotes: resolutionNotes.trim() || undefined,
      })

      if (!res.success) {
        setError(res.error || "Failed to create manual complaint log.")
        setIsSubmitting(false)
        return
      }

      // Reset and close
      setCustomerName("")
      setCustomerNumber("")
      setCustomerSocials("")
      setCustomerPlatform("Threads")
      setCustomPlatform("")
      setPriority(ManualComplaintPriority.YELLOW)
      setStatus(ManualComplaintStatus.OPEN)
      setPicHandling("Zara - Customer Careline")
      setCustomPic("")
      setMainComplaint("")
      setResolutionNotes("")

      setIsSubmitting(false)
      onClose()
      router.refresh()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "An unexpected error occurred.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Log Manual Complaint
              </h2>
              <p className="text-xs text-slate-500">
                Quick intake tracking for customer feedback, social channels & careline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Customer Information */}
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Customer Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siti Aminah"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Number / Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 011-2345678"
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Platform <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Share2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={customerPlatform}
                    onChange={(e) => setCustomerPlatform(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {MANUAL_PLATFORM_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Kalau Others tu baru keluar kolum untuk isi tempat kosong */}
                {customerPlatform === "Other (Please Specify)" && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="text"
                      required
                      placeholder="Please specify platform..."
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-indigo-50/30 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Socials / Handle
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. @sitiaminah_99 or order link"
                    value={customerSocials}
                    onChange={(e) => setCustomerSocials(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Priority & Status & PIC */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Priority, Status & PIC Handling
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Complaint Priority <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPriority(ManualComplaintPriority.GREEN)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                    priority === ManualComplaintPriority.GREEN
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Green</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 mt-0.5">
                    Low / Inquiry
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority(ManualComplaintPriority.YELLOW)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                    priority === ManualComplaintPriority.YELLOW
                      ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Yellow</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 mt-0.5">
                    Medium / Delay
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority(ManualComplaintPriority.RED)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                    priority === ManualComplaintPriority.RED
                      ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Red</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 mt-0.5">
                    Critical / Defect
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Complaint Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ManualComplaintStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={ManualComplaintStatus.OPEN}>Open (New)</option>
                  <option value={ManualComplaintStatus.ONGOING}>Ongoing (In Progress)</option>
                  <option value={ManualComplaintStatus.ESCALATED_E3}>Escalated (E3)</option>
                  <option value={ManualComplaintStatus.CLOSED}>Closed (Resolved)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIC Handling <span className="text-rose-500">*</span>
                </label>
                <select
                  value={picHandling}
                  onChange={(e) => setPicHandling(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {MANUAL_PIC_OPTIONS.map((pic) => (
                    <option key={pic} value={pic}>
                      {pic}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {picHandling === "Other" && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="text"
                      required
                      placeholder="Enter PIC name..."
                      value={customPic}
                      onChange={(e) => setCustomPic(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-indigo-50/30 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Main Complaint & Resolution */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Main Complaint <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe the complaint in detail (e.g. Broken seal, foul smell, delayed delivery, leaked cap, etc.)..."
                value={mainComplaint}
                onChange={(e) => setMainComplaint(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Action / Resolution Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Action taken or response given to the customer..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Save Complaint Log
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
