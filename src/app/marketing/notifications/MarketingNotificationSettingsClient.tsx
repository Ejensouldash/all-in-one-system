"use client"

import React, { useState } from "react"
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
  Layers, 
  Box, 
  Calendar, 
  Send, 
  RotateCw, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Check,
  Search,
  Sparkles
} from "lucide-react"
import { 
  createMarketingNotificationRecipient, 
  updateMarketingNotificationRecipient, 
  toggleMarketingNotificationRecipient, 
  deleteMarketingNotificationRecipient,
  getMarketingOutboxPaginated,
  retryMarketingOutboxEmailAction,
  sendMarketingTestEmailAction
} from "@/app/actions/marketing-notifications"

type Recipient = {
  id: string
  name: string
  email: string
  category: string | null
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

type OutboxItem = {
  id: string
  referenceId: string | null
  category: string
  to: string
  subject: string
  status: string
  error: string | null
  attempts: number
  sentAt: Date | null
  createdAt: Date
}

export function MarketingNotificationSettingsClient({
  initialRecipients,
  initialOutbox = [],
  initialTotalCount = 0,
  initialTotalPages = 1,
  userName,
}: {
  initialRecipients: Recipient[]
  initialOutbox?: OutboxItem[]
  initialTotalCount?: number
  initialTotalPages?: number
  userName: string
}) {
  const [activeTab, setActiveTab] = useState<"RECIPIENTS" | "OUTBOX">("RECIPIENTS")
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients)
  const [outbox, setOutbox] = useState<OutboxItem[]>(initialOutbox)
  const [outboxPage, setOutboxPage] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount || initialOutbox.length)
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages || 1)
  const [isOutboxLoading, setIsOutboxLoading] = useState<boolean>(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Test Email state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testName, setTestName] = useState(userName)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ success?: boolean; message?: string } | null>(null)

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "ALL",
    isEnabled: true,
  })

  // Metric counts
  const totalRecipientsCount = recipients.length
  const activeRecipientsCount = recipients.filter((r) => r.isEnabled).length
  const outboxSentCount = outbox.filter((o) => o.status === "SENT").length
  const outboxFailedCount = outbox.filter((o) => o.status === "FAILED").length

  const openAddModal = () => {
    setEditingRecipient(null)
    setFormData({
      name: "",
      email: "",
      category: "ALL",
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
      category: rec.category || "ALL",
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

    const res = await toggleMarketingNotificationRecipient(id, nextStatus)
    if (!res.success) {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isEnabled: currentStatus } : r))
      )
      setError(res.error || "Failed to update status.")
    } else {
      setSuccess("Status updated successfully.")
      setTimeout(() => setSuccess(""), 2500)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from marketing notifications?`)) return

    const res = await deleteMarketingNotificationRecipient(id)
    if (res.success) {
      setRecipients((prev) => prev.filter((r) => r.id !== id))
      setSuccess("Recipient removed successfully.")
      setTimeout(() => setSuccess(""), 2500)
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
    fData.set("category", formData.category)
    fData.set("isEnabled", formData.isEnabled ? "true" : "false")

    if (editingRecipient) {
      const res = await updateMarketingNotificationRecipient(editingRecipient.id, fData)
      setIsSubmitting(false)
      if (res.success && res.recipient) {
        setRecipients((prev) =>
          prev.map((r) => (r.id === editingRecipient.id ? (res.recipient as any) : r))
        )
        setIsModalOpen(false)
        setSuccess("Recipient updated successfully.")
        setTimeout(() => setSuccess(""), 2500)
      } else {
        setError(res.error || "Failed to update recipient.")
      }
    } else {
      const res = await createMarketingNotificationRecipient(fData)
      setIsSubmitting(false)
      if (res.success && res.recipient) {
        setRecipients((prev) => [...prev, res.recipient as any])
        setIsModalOpen(false)
        setSuccess("New recipient added successfully.")
        setTimeout(() => setSuccess(""), 2500)
      } else {
        setError(res.error || "Failed to add recipient.")
      }
    }
  }

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages) || isOutboxLoading) return
    setIsOutboxLoading(true)
    setError("")
    try {
      const res = await getMarketingOutboxPaginated(newPage, 10)
      setOutbox(res.items as any)
      setTotalCount(res.totalCount)
      setTotalPages(res.totalPages)
      setOutboxPage(res.currentPage)
    } catch (err: any) {
      setError(err?.message || "Failed to load outbox logs.")
    } finally {
      setIsOutboxLoading(false)
    }
  }

  const handleRetryOutbox = async (id: string) => {
    setRetryingId(id)
    setError("")
    const res = await retryMarketingOutboxEmailAction(id)
    setRetryingId(null)

    if (res.success) {
      setSuccess("Email sent successfully via Resend!")
      setTimeout(() => setSuccess(""), 2500)
      await handlePageChange(outboxPage)
    } else {
      setError(res.error || "Retry failed. Provider rejected delivery.")
    }
  }

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSendingTest(true)
    setTestFeedback(null)

    const res = await sendMarketingTestEmailAction(testEmail, testName)
    setIsSendingTest(false)

    if (res.success) {
      setTestFeedback({ success: true, message: res.message || "Test email dispatched successfully!" })
      await handlePageChange(1)
    } else {
      setTestFeedback({ success: false, message: res.error || "Failed to deliver test email." })
    }
  }

  // Filtered recipients
  const filteredRecipients = recipients.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      categoryFilter === "ALL" || r.category === categoryFilter || r.category === "ALL" || !r.category
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Mail className="h-3 w-3" /> Resend Integration
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Marketing Email Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configure automated email notifications for Asset Loans, Merchandise requests, and Event requisitions. Emails are dispatched via Resend to assigned PICs.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setTestFeedback(null)
              setIsTestModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <Send className="h-3.5 w-3.5 text-blue-600" />
            <span>Send Test Email</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-all shadow-sm hover:shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Add Recipient</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{success}</div>
          <button type="button" onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recipients</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalRecipientsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Bell className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Recipients</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeRecipientsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outbox Sent</span>
            <p className="text-2xl font-black text-blue-600 mt-1">{outboxSentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Send className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failed / Pending</span>
            <p className={`text-2xl font-black mt-1 ${outboxFailedCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
              {outboxFailedCount}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${outboxFailedCount > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"}`}>
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Sub-tabs (Like FMS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2">
          <button
            type="button"
            onClick={() => setActiveTab("RECIPIENTS")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "RECIPIENTS"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Category Routing &amp; Recipients</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {recipients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OUTBOX")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "OUTBOX"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Outbox &amp; Delivery Logs</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {totalCount}
            </span>
          </button>
        </div>

        {/* TAB 1: RECIPIENTS */}
        {activeTab === "RECIPIENTS" && (
          <div className="p-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {["ALL", "ASSET", "MERCHANDISE", "EVENT"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      categoryFilter === cat
                        ? "bg-blue-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat === "ALL" ? "All Categories" : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">PIC Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Routing Category</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No notification recipients configured yet.</p>
                        <p className="text-[11px] mt-1">Click &ldquo;Add Recipient&rdquo; to setup email alerts for marketing requests.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {rec.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">
                          {rec.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                              !rec.category || rec.category === "ALL"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : rec.category === "ASSET"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : rec.category === "MERCHANDISE"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {!rec.category || rec.category === "ALL" ? (
                              <>
                                <Sparkles className="h-3 w-3" /> All Categories
                              </>
                            ) : rec.category === "ASSET" ? (
                              <>
                                <Layers className="h-3 w-3" /> Assets Only
                              </>
                            ) : rec.category === "MERCHANDISE" ? (
                              <>
                                <Box className="h-3 w-3" /> Merchandise Only
                              </>
                            ) : (
                              <>
                                <Calendar className="h-3 w-3" /> Events Only
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(rec.id, rec.isEnabled)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rec.isEnabled ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                rec.isEnabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              title="Edit Recipient"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rec.id, rec.name)}
                              title="Delete Recipient"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          </div>
        )}

        {/* TAB 2: OUTBOX */}
        {activeTab === "OUTBOX" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Outbox &amp; Delivery Audit</h3>
                <p className="text-[11px] text-slate-500">Live delivery records processed through Resend</p>
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(outboxPage)}
                disabled={isOutboxLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isOutboxLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Outbox Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Sent / Created</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outbox.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No outbox email records yet.</p>
                        <p className="text-[11px] mt-1">Submitted forms will automatically generate delivery records here.</p>
                      </td>
                    </tr>
                  ) : (
                    outbox.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {item.referenceId || "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {item.to}
                        </td>
                        <td className="py-3 px-4 text-slate-900 max-w-xs truncate" title={item.subject}>
                          {item.subject}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.status === "SENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "FAILED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {item.status === "SENT" ? (
                              <>
                                <Check className="h-3 w-3" /> SENT
                              </>
                            ) : item.status === "FAILED" ? (
                              <>
                                <AlertCircle className="h-3 w-3" /> FAILED
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" /> PENDING
                              </>
                            )}
                          </span>
                          {item.error && (
                            <p className="text-[10px] text-rose-500 font-mono mt-0.5 max-w-xs truncate" title={item.error}>
                              {item.error}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {item.sentAt
                            ? new Date(item.sentAt).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })
                            : new Date(item.createdAt).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.status === "FAILED" ? (
                            <button
                              type="button"
                              onClick={() => handleRetryOutbox(item.id)}
                              disabled={retryingId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold disabled:opacity-50 transition-colors"
                            >
                              {retryingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCw className="h-3 w-3" />
                              )}
                              <span>Retry</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">OK</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Showing page {outboxPage} of {totalPages} ({totalCount} total entries)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(outboxPage - 1)}
                    disabled={outboxPage <= 1 || isOutboxLoading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(outboxPage + 1)}
                    disabled={outboxPage >= totalPages || isOutboxLoading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT RECIPIENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900">
                {editingRecipient ? "Edit Notification Recipient" : "Add New Notification Recipient"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIC Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nurul Syahirah"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. syahirah@bubbleso2.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Routing Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ALL">ALL Categories (Assets, Merchandise &amp; Events)</option>
                  <option value="ASSET">ASSET Only (Asset Loan Requests)</option>
                  <option value="MERCHANDISE">MERCHANDISE Only (Merchandise Requests)</option>
                  <option value="EVENT">EVENT Only (Event Support Requisitions)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Recipient will receive automated email alerts matching this category.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isEnabled" className="text-xs font-medium text-slate-700">
                  Enable active notifications for this recipient
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingRecipient ? "Save Changes" : "Create Recipient"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SEND TEST EMAIL */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Send Test Email Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Verify your Resend connection immediately. This will dispatch a branded test email to the specified address and register it in the outbox.
              </p>

              {testFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testFeedback.success
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  {testFeedback.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>{testFeedback.message}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Email</label>
                <input
                  type="email"
                  required
                  placeholder="your.email@bubbleso2.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing Lead"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSendingTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Send Test Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
