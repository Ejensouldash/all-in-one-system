"use client"

import { useState } from "react"
import { 
  Bell, 
  Mail, 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  X, 
  Loader2, 
  AlertCircle, 
  Zap, 
  Building, 
  Cog, 
  HelpCircle,
  Layers,
  ArrowLeft,
  RotateCw,
  Clock,
  Send
} from "lucide-react"
import Link from "next/link"
import { 
  createMaintenanceNotificationRecipient, 
  updateMaintenanceNotificationRecipient, 
  toggleMaintenanceNotificationRecipient, 
  deleteMaintenanceNotificationRecipient,
  retryMaintenanceOutboxEmailAction
} from "@/app/actions/maintenance-notifications"

type Recipient = {
  id: string
  name: string
  email: string
  ticketType: string | null
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

type OutboxItem = {
  id: string
  ticketId: string | null
  to: string
  subject: string
  status: string
  error: string | null
  attempts: number
  sentAt: Date | null
  createdAt: Date
}

export function MaintenanceNotificationSettingsClient({
  initialRecipients,
  initialOutbox = [],
}: {
  initialRecipients: Recipient[]
  initialOutbox?: OutboxItem[]
}) {
  const [activeTab, setActiveTab] = useState<"RECIPIENTS" | "OUTBOX">("RECIPIENTS")
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients)
  const [outbox, setOutbox] = useState<OutboxItem[]>(initialOutbox)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    ticketType: "ALL",
    isEnabled: true,
  })

  const openAddModal = () => {
    setEditingRecipient(null)
    setFormData({
      name: "",
      email: "",
      ticketType: "ALL",
      isEnabled: true,
    })
    setError("")
    setIsModalOpen(true)
  }

  const openEditModal = (rec: Recipient) => {
    setEditingRecipient(rec)
    setFormData({
      name: rec.name,
      email: rec.email,
      ticketType: rec.ticketType || "ALL",
      isEnabled: rec.isEnabled,
    })
    setError("")
    setIsModalOpen(true)
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: nextStatus } : r))
    )

    const res = await toggleMaintenanceNotificationRecipient(id, nextStatus)
    if (!res.success) {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isEnabled: currentStatus } : r))
      )
      setError(res.error || "Failed to toggle status.")
    } else {
      setSuccess("Status updated successfully.")
      setTimeout(() => setSuccess(""), 2000)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from notifications?`)) return

    const res = await deleteMaintenanceNotificationRecipient(id)
    if (res.success) {
      setRecipients((prev) => prev.filter((r) => r.id !== id))
      setSuccess("Recipient removed.")
      setTimeout(() => setSuccess(""), 2000)
    } else {
      setError(res.error || "Failed to delete recipient.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const fData = new FormData()
    fData.set("name", formData.name)
    fData.set("email", formData.email)
    fData.set("ticketType", formData.ticketType)
    fData.set("isEnabled", formData.isEnabled ? "true" : "false")

    if (editingRecipient) {
      const res = await updateMaintenanceNotificationRecipient(editingRecipient.id, fData)
      setIsSubmitting(false)
      if (res.success && res.recipient) {
        setRecipients((prev) =>
          prev.map((r) => (r.id === editingRecipient.id ? (res.recipient as any) : r))
        )
        setIsModalOpen(false)
        setSuccess("Recipient updated successfully.")
        setTimeout(() => setSuccess(""), 2000)
      } else {
        setError(res.error || "Failed to update recipient.")
      }
    } else {
      const res = await createMaintenanceNotificationRecipient(fData)
      setIsSubmitting(false)
      if (res.success && res.recipient) {
        setRecipients((prev) => [...prev, res.recipient as any])
        setIsModalOpen(false)
        setSuccess("New recipient added.")
        setTimeout(() => setSuccess(""), 2000)
      } else {
        setError(res.error || "Failed to add recipient.")
      }
    }
  }

  const handleRetryOutbox = async (id: string) => {
    setRetryingId(id)
    setError("")
    const res = await retryMaintenanceOutboxEmailAction(id)
    setRetryingId(null)

    if (res.success) {
      setOutbox((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "SENT", sentAt: new Date(), error: null, attempts: item.attempts + 1 }
            : item
        )
      )
      setSuccess("Email sent successfully!")
      setTimeout(() => setSuccess(""), 2000)
    } else {
      setError(res.error || "Retry failed. Provider rejected delivery.")
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/forms/maintenance/tickets"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Maintenance Ledger
        </Link>

        {/* Tab switch */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("RECIPIENTS")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "RECIPIENTS"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Category Routing</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("OUTBOX")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "OUTBOX"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Outbox &amp; Delivery</span>
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {activeTab === "RECIPIENTS" ? "Maintenance Email Alert Routing" : "Notification Delivery Outbox"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === "RECIPIENTS"
              ? "Route new work orders to responsible engineering PICs based on issue category."
              : "Audit delivery status of all automated emails with instant retry capabilities."}
          </p>
        </div>

        {activeTab === "RECIPIENTS" && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Recipient</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TAB 1: RECIPIENTS */}
      {activeTab === "RECIPIENTS" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Routed Category</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No recipients configured. Click "Add Recipient" to set up notification routing.
                  </td>
                </tr>
              ) : (
                recipients.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{rec.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{rec.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        rec.ticketType === 'MECHANICAL'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.ticketType === 'CIVIL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.ticketType === 'ELECTRICAL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {rec.ticketType || "ALL CATEGORIES"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(rec.id, rec.isEnabled)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          rec.isEnabled
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {rec.isEnabled ? "ACTIVE" : "DISABLED"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id, rec.name)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: OUTBOX */}
      {activeTab === "OUTBOX" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Attempts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {outbox.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No emails recorded in the outbox yet.
                  </td>
                </tr>
              ) : (
                outbox.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{item.to}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{item.subject}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'SENT'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'FAILED'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {item.attempts}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === "FAILED" && (
                        <button
                          type="button"
                          disabled={retryingId === item.id}
                          onClick={() => handleRetryOutbox(item.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          {retryingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCw className="h-3 w-3" />
                          )}
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Recipient Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {editingRecipient ? "Edit Notification Recipient" : "Add Notification Recipient"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Akmal (Mechanical Lead)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. akmal@bubbleso2.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Category Filter</label>
                <select
                  value={formData.ticketType}
                  onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="ALL">All Categories</option>
                  <option value="MECHANICAL">Mechanical</option>
                  <option value="CIVIL">Civil &amp; Facility</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="OTHERS">Others</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isEnabled" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active (Receive email notifications)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Save Recipient</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
