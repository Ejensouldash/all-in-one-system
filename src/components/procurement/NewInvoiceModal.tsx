"use client"

import { useState, useEffect } from "react"
import {
  X,
  FileText,
  Upload,
  Calendar,
  Building,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Save,
  Send,
} from "lucide-react"
import {
  ProcurementPaymentTerm,
  ProcurementInvoiceCategory,
  ProcurementInvoiceStatus,
} from "@prisma/client"
import {
  COMPANY_OPTIONS,
  DEPARTMENT_OPTIONS,
  PAYMENT_TERMS_CONFIG,
  INVOICE_CATEGORY_CONFIG,
} from "./procurement-constants"
import {
  createInvoice,
  uploadProcurementDocument,
  getSuppliers,
} from "@/app/actions/procurement"

interface NewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  defaultCategory?: ProcurementInvoiceCategory
}

export function NewInvoiceModal({
  isOpen,
  onClose,
  onCreated,
  defaultCategory = ProcurementInvoiceCategory.STANDARD_TERMS,
}: NewInvoiceModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)

  // Form State
  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [company, setCompany] = useState(COMPANY_OPTIONS[0])
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0])
  const [category, setCategory] = useState<ProcurementInvoiceCategory>(defaultCategory)
  const [amount, setAmount] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [doReceived, setDoReceived] = useState(false)
  const [originalInvoiceReceived, setOriginalInvoiceReceived] = useState(false)
  const [notes, setNotes] = useState("")

  // File Upload State
  const [file, setFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoadingSuppliers(true)
      getSuppliers({ activeOnly: true })
        .then((data) => {
          setSuppliers(data)
          if (data.length > 0 && !supplierId) {
            setSupplierId(data[0].id)
            calculateDueDate(data[0].terms, invoiceDate)
          }
        })
        .catch((err) => console.error("Error loading suppliers:", err))
        .finally(() => setLoadingSuppliers(false))

      setCategory(defaultCategory)
      setError(null)
    }
  }, [isOpen, defaultCategory])

  // Automatically calculate Due Date based on Supplier terms
  const calculateDueDate = (termKey: string, invDateStr: string) => {
    if (!invDateStr) return
    const baseDate = new Date(invDateStr)
    if (isNaN(baseDate.getTime())) return

    const config = PAYMENT_TERMS_CONFIG[termKey]
    if (config) {
      if (config.days > 0) {
        baseDate.setDate(baseDate.getDate() + config.days)
        setDueDate(baseDate.toISOString().split("T")[0])
      } else {
        // Immediate / Cash / CBD
        setDueDate(invDateStr)
      }
    }
  }

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value
    setSupplierId(sId)
    const found = suppliers.find((s) => s.id === sId)
    if (found) {
      calculateDueDate(found.terms, invoiceDate)
      // If supplier is Cash Before Delivery, auto-recommend Cash category
      if (found.terms === "CASH_BEFORE_DELIVERY" || found.terms === "CASH") {
        setCategory(ProcurementInvoiceCategory.CASH_PREPAYMENT)
      }
    }
  }

  const handleInvoiceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setInvoiceDate(newDate)
    const found = suppliers.find((s) => s.id === supplierId)
    if (found) {
      calculateDueDate(found.terms, newDate)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (targetStatus: ProcurementInvoiceStatus) => {
    if (!invoiceNumber.trim()) {
      setError("Please provide an invoice number.")
      return
    }
    if (!supplierId) {
      setError("Please select a supplier.")
      return
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid invoice amount.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let attachmentUrl: string | undefined
      let attachmentName: string | undefined

      // Upload document if attached
      if (file) {
        setUploadingFile(true)
        const fd = new FormData()
        fd.append("file", file)
        fd.append("folder", "invoices")
        const uploadRes = await uploadProcurementDocument(fd)
        setUploadingFile(false)

        if (!uploadRes.success) {
          setError(uploadRes.error || "Failed to upload invoice attachment.")
          setSubmitting(false)
          return
        }
        attachmentUrl = uploadRes.url
        attachmentName = uploadRes.filename
      }

      const res = await createInvoice({
        invoiceNumber: invoiceNumber.trim(),
        poNumber: poNumber.trim() || undefined,
        company,
        department,
        supplierId,
        category,
        status: targetStatus,
        invoiceDate,
        dueDate: dueDate || undefined,
        amount: Number(amount),
        doReceived,
        originalInvoiceReceived,
        attachmentUrl,
        attachmentName,
        notes: notes.trim() || undefined,
      })

      if (!res.success) {
        setError(res.error || "Failed to create invoice.")
        setSubmitting(false)
        return
      }

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
      setUploadingFile(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                New Invoice for Payment
              </h2>
              <p className="text-xs text-slate-500">
                Record invoice, attach bill/DO, and dispatch to Finance for settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Category Selection Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(INVOICE_CATEGORY_CONFIG).map(([key, config]) => {
                const isSelected = category === key
                const isCash = key === "CASH_PREPAYMENT"

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key as ProcurementInvoiceCategory)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      isSelected
                        ? isCash
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                          : "bg-blue-600 text-white border-blue-700 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{config.short}</span>
                      {isCash && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                            isSelected ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          Urgent
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] leading-tight ${
                        isSelected ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {isCash
                        ? "Goods dispatched only after payment"
                        : key === "MONTHLY_SUBSCRIPTION"
                        ? "Recurring subscription/service"
                        : "Invoices with 7/30/60 days credit terms"}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Supplier Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Supplier <span className="text-rose-500">*</span>
            </label>
            {loadingSuppliers ? (
              <div className="py-2 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading vendors...
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={handleSupplierChange}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({PAYMENT_TERMS_CONFIG[s.terms]?.label || s.terms})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Invoice Number & PO / PI Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number (INV NO) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2611/0054"
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PO / PI Number (Optional)
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO001996 or PI002721"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Company & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company <span className="text-rose-500">*</span>
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-semibold"
              >
                {COMPANY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Cost Center <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (RM) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                  RM
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={handleInvoiceDateChange}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date (Auto / Manual)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Physical Document Tracking Checks */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
            <p className="text-xs font-bold text-slate-700">Physical Document Receive Status</p>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doReceived}
                  onChange={(e) => setDoReceived(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Delivery Order (DO) Received</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={originalInvoiceReceived}
                  onChange={(e) => setOriginalInvoiceReceived(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Original Physical Invoice Received</span>
              </label>
            </div>
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Invoice / DO Document (PDF / Image)
            </label>
            <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 transition-colors text-center bg-slate-50/50">
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <Upload className="w-5 h-5 text-slate-400" />
                {file ? (
                  <p className="text-xs font-semibold text-blue-600 truncate max-w-xs">
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-600">
                      Click or drag and drop invoice PDF or photo
                    </p>
                    <p className="text-[10px] text-slate-400">PDF, PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes / Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remark / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Urgent payment required for raw material delivery..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(ProcurementInvoiceStatus.DRAFT)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(ProcurementInvoiceStatus.PENDING_FINANCE)}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadingFile ? "Uploading..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit to Finance
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
