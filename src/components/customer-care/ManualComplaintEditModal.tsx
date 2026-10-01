"use client"

import { useState, useEffect } from "react"
import {
  X,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Share2,
  AtSign,
  Tag,
  ShieldAlert,
} from "lucide-react"
import { ManualComplaintPriority, ManualComplaintStatus } from "@prisma/client"
import { updateManualComplaint, deleteManualComplaint } from "@/app/actions/manual-complaints"
import { MANUAL_PLATFORM_OPTIONS, MANUAL_PIC_OPTIONS } from "@/components/customer-care/ManualComplaintModal"
import { useRouter } from "next/navigation"

export interface ManualComplaintItem {
  id: string
  complaintNumber: string
  createdAt: string | Date
  customerName: string
  customerNumber: string
  customerSocials: string | null
  customerPlatform: string
  mainComplaint: string
  priority: ManualComplaintPriority
  status: ManualComplaintStatus
  picHandling: string
  resolutionNotes: string | null
  resolvedAt: string | Date | null
  createdBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface ManualComplaintEditModalProps {
  complaint: ManualComplaintItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  canManage: boolean
}

export function ManualComplaintEditModal({
  complaint,
  isOpen,
  onClose,
  onSuccess,
  canManage,
}: ManualComplaintEditModalProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields
  const [status, setStatus] = useState<ManualComplaintStatus>(ManualComplaintStatus.OPEN)
  const [priority, setPriority] = useState<ManualComplaintPriority>(ManualComplaintPriority.YELLOW)
  const [customerPlatform, setCustomerPlatform] = useState("Threads")
  const [customPlatform, setCustomPlatform] = useState("")
  const [picHandling, setPicHandling] = useState("Zara - Customer Careline")
  const [customPic, setCustomPic] = useState("")
  const [customerSocials, setCustomerSocials] = useState("")
  const [mainComplaint, setMainComplaint] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status)
      setPriority(complaint.priority)

      // Handle platform
      if (MANUAL_PLATFORM_OPTIONS.includes(complaint.customerPlatform) && complaint.customerPlatform !== "Other (Please Specify)") {
        setCustomerPlatform(complaint.customerPlatform)
        setCustomPlatform("")
      } else {
        setCustomerPlatform("Other (Please Specify)")
        setCustomPlatform(complaint.customerPlatform || "")
      }

      // Handle PIC
      if (MANUAL_PIC_OPTIONS.includes(complaint.picHandling)) {
        setPicHandling(complaint.picHandling)
        setCustomPic("")
      } else {
        setPicHandling("Other")
        setCustomPic(complaint.picHandling || "")
      }

      setCustomerSocials(complaint.customerSocials || "")
      setMainComplaint(complaint.mainComplaint || "")
      setResolutionNotes(complaint.resolutionNotes || "")
      setError(null)
      setConfirmDelete(false)
    }
  }, [complaint])

  if (!isOpen || !complaint) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    setError(null)

    if (customerPlatform === "Other (Please Specify)" && !customPlatform.trim()) {
      setError("Please specify the Customer Platform.")
      return
    }

    const platformToSave =
      customerPlatform === "Other (Please Specify)"
        ? customPlatform.trim() || "Other"
        : customerPlatform

    const picToSave =
      picHandling === "Other"
        ? customPic.trim() || "Customer Care"
        : picHandling

    setIsSaving(true)

    try {
      const res = await updateManualComplaint(complaint.id, {
        status,
        priority,
        customerPlatform: platformToSave,
        picHandling: picToSave,
        customerSocials: customerSocials.trim() || undefined,
        mainComplaint: mainComplaint.trim() || undefined,
        resolutionNotes: resolutionNotes.trim() || undefined,
      })

      if (!res.success) {
        setError(res.error || "Failed to update complaint.")
        setIsSaving(false)
        return
      }

      setIsSaving(false)
      onClose()
      router.refresh()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err?.message || "Failed to update complaint.")
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canManage) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const res = await deleteManualComplaint(complaint.id)
      if (!res.success) {
        setError(res.error || "Failed to delete complaint.")
        setIsDeleting(false)
        return
      }

      setIsDeleting(false)
      onClose()
      router.refresh()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err?.message || "Failed to delete.")
      setIsDeleting(false)
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                {complaint.complaintNumber}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Logged on {new Date(complaint.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Edit & Resolve Complaint
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Customer</div>
              <div className="font-bold text-slate-800 truncate mt-0.5">{complaint.customerName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Phone / Contact</div>
              <a
                href={`https://wa.me/${complaint.customerNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-emerald-600 hover:underline truncate block mt-0.5"
              >
                {complaint.customerNumber}
              </a>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Platform</div>
              <div className="font-bold text-slate-800 truncate mt-0.5">{complaint.customerPlatform}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Logged By</div>
              <div className="font-medium text-slate-600 truncate mt-0.5">
                {complaint.createdBy?.name || "System"}
              </div>
            </div>
          </div>

          {/* Platform & Socials Update */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Platform
              </label>
              <select
                value={customerPlatform}
                onChange={(e) => setCustomerPlatform(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {MANUAL_PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {customerPlatform === "Other (Please Specify)" && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="text"
                    required
                    placeholder="Please specify platform..."
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-indigo-50/30 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Socials / Handle / Link
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSocials}
                  onChange={(e) => setCustomerSocials(e.target.value)}
                  placeholder="@username or customer link"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Complaint Priority
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPriority(ManualComplaintPriority.GREEN)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  priority === ManualComplaintPriority.GREEN
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Green (Low)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPriority(ManualComplaintPriority.YELLOW)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  priority === ManualComplaintPriority.YELLOW
                    ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Yellow (Medium)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPriority(ManualComplaintPriority.RED)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  priority === ManualComplaintPriority.RED
                    ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Red (Critical)</span>
                </div>
              </button>
            </div>
          </div>

          {/* Status & PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complaint Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ManualComplaintStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={ManualComplaintStatus.OPEN}>Open (New)</option>
                <option value={ManualComplaintStatus.ONGOING}>Ongoing (In Progress)</option>
                <option value={ManualComplaintStatus.ESCALATED_E3}>Escalated (E3)</option>
                <option value={ManualComplaintStatus.CLOSED}>Closed (Resolved)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIC Handling
              </label>
              <select
                value={picHandling}
                onChange={(e) => setPicHandling(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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

          {/* Main Complaint */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Main Complaint Body
            </label>
            <textarea
              rows={3}
              value={mainComplaint}
              onChange={(e) => setMainComplaint(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Resolution Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Resolution Notes & Actions Taken
            </label>
            <p className="text-[11px] text-slate-500">
              Record solutions, customer replacement details, vouchers given, or closing remarks.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Sent replacement bottle via courier, tracking number: MY12345. Customer confirmed satisfied."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {canManage ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-600 font-bold">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
              {canManage && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
