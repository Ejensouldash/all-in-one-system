"use client"

import { useState } from "react"
import {
  X,
  FileText,
  Building2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ExternalLink,
  Upload,
  Loader2,
  Send,
  Ban,
  ArrowRight,
  ShieldCheck,
  Receipt,
} from "lucide-react"
import {
  ProcurementInvoiceStatus,
  ProcurementInvoiceCategory,
} from "@prisma/client"
import {
  INVOICE_STATUS_CONFIG,
  INVOICE_CATEGORY_CONFIG,
  PAYMENT_TERMS_CONFIG,
} from "./procurement-constants"
import {
  updateInvoiceStatus,
  recordPayment,
  uploadProcurementDocument,
} from "@/app/actions/procurement"

interface InvoiceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  onUpdated: () => void
  isFinanceOrAdmin: boolean
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  onUpdated,
  isFinanceOrAdmin,
}: InvoiceDetailModalProps) {
  const [activeAction, setActiveAction] = useState<"NONE" | "PAY" | "REJECT">("NONE")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0])
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !invoice) return null

  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status] || {
    label: invoice.status,
    badgeClass: "bg-slate-100 text-slate-700",
    dotClass: "bg-slate-400",
  }
  const categoryConfig = INVOICE_CATEGORY_CONFIG[invoice.category] || {
    label: invoice.category,
    badgeClass: "bg-slate-100 text-slate-700",
  }
  const isCash = invoice.category === "CASH_PREPAYMENT"

  const handleMarkInReview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await updateInvoiceStatus(invoice.id, ProcurementInvoiceStatus.IN_REVIEW)
      if (!res.success) {
        setError(res.error || "Failed to update status.")
      } else {
        onUpdated()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleResubmitToFinance = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await updateInvoiceStatus(
        invoice.id,
        ProcurementInvoiceStatus.PENDING_FINANCE,
        "Re-submitted to Finance by Purchasing"
      )
      if (!res.success) {
        setError(res.error || "Failed to submit to Finance.")
      } else {
        onUpdated()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!paidAt) {
      setError("Please select the payment date.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      let receiptUrl: string | undefined
      if (paymentReceiptFile) {
        const fd = new FormData()
        fd.append("file", paymentReceiptFile)
        fd.append("folder", "receipts")
        const uploadRes = await uploadProcurementDocument(fd)
        if (!uploadRes.success) {
          setError(uploadRes.error || "Failed to upload receipt file.")
          setLoading(false)
          return
        }
        receiptUrl = uploadRes.url
      }

      const res = await recordPayment(invoice.id, {
        paidAt,
        paymentReference: paymentReference.trim() || undefined,
        paymentReceiptUrl: receiptUrl,
        notes: actionNotes.trim() || undefined,
      })

      if (!res.success) {
        setError(res.error || "Failed to record payment.")
        setLoading(false)
        return
      }

      onUpdated()
      onClose()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReject = async () => {
    if (!actionNotes.trim()) {
      setError("Please provide a reason or note for rejecting the invoice.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await updateInvoiceStatus(
        invoice.id,
        ProcurementInvoiceStatus.REJECTED,
        actionNotes.trim()
      )
      if (!res.success) {
        setError(res.error || "Failed to reject invoice.")
        setLoading(false)
        return
      }

      onUpdated()
      onClose()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {invoice.invoiceNumber}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full border ${statusConfig.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                  {statusConfig.label}
                </span>
                {isCash && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-rose-100 text-rose-700 border border-rose-200">
                    Urgent Prepayment
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Created on {new Date(invoice.createdAt).toLocaleDateString()} by{" "}
                {invoice.createdBy?.name || "Purchasing"}
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Amount
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                RM {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                PO / PI Number
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1 font-mono">
                {invoice.poNumber || "-"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Due Date
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString()
                  : "Immediate / CBD"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Category
              </p>
              <p className="text-xs font-semibold text-blue-700 mt-1">
                {categoryConfig.label}
              </p>
            </div>
          </div>

          {/* Detail Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Vendor & Company Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Vendor & Cost Center
              </h3>
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <p className="text-sm font-bold text-slate-900">{invoice.supplier?.name}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Terms:</span>
                  <span className="font-semibold text-slate-800">
                    {PAYMENT_TERMS_CONFIG[invoice.supplier?.terms]?.label || invoice.supplier?.terms}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Company:</span>
                  <span className="font-semibold text-slate-800">{invoice.company}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500">Department:</span>
                  <p className="font-semibold text-slate-800">{invoice.department}</p>
                </div>
              </div>
            </div>

            {/* Document Tracking & Attachments */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Document & Handover
              </h3>
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">DO Received:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      invoice.doReceived
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {invoice.doReceived ? "YES" : "NO"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Original Invoice Received:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      invoice.originalInvoiceReceived
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {invoice.originalInvoiceReceived ? "YES" : "NO"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">Invoice Document:</span>
                  {invoice.attachmentUrl ? (
                    <a
                      href={invoice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Attachment
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No attachment</span>
                  )}
                </div>

                {invoice.paymentReceiptUrl && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600">Payment Proof:</span>
                    <a
                      href={invoice.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      View Bank Receipt
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Remarks / Notes
              </h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                {invoice.notes}
              </div>
            </div>
          )}

          {/* Payment Information if Paid */}
          {invoice.status === "PAID" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Payment Settlement Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-900 pt-1">
                <div>
                  <span className="text-emerald-700 font-medium">Payment Date:</span>
                  <p className="font-bold">
                    {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-emerald-700 font-medium">Reference No:</span>
                  <p className="font-bold font-mono">{invoice.paymentReference || "N/A"}</p>
                </div>
                <div>
                  <span className="text-emerald-700 font-medium">Processed By:</span>
                  <p className="font-bold">{invoice.paidBy?.name || "Finance"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Action Forms for Finance */}
          {activeAction === "PAY" && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Record Settlement / Mark as Paid
                </h4>
                <button
                  onClick={() => setActiveAction("NONE")}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Bank Reference / Check No
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. MBB-TRX-998811 or Cheque #12345"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">
                  Upload Payment Proof / Bank Slip (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmPayment}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm & Mark as Paid
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeAction === "REJECT" && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600" />
                  Return or Reject Invoice
                </h4>
                <button
                  onClick={() => setActiveAction("NONE")}
                  className="text-xs text-rose-700 hover:text-rose-900 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-900 mb-1">
                  Reason for rejection / missing items <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Missing signed DO, amount discrepancy with PO..."
                  className="w-full px-3 py-2 text-sm bg-white border border-rose-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmReject}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Activity Audit Trail */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Handover & Activity History
            </h3>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
              {invoice.activityLogs?.map((log: any) => (
                <div key={log.id} className="p-3 bg-white flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.notes && <p className="text-slate-600 mt-0.5">{log.notes}</p>}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      By {log.performedBy?.name || "System"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* Purchasing action if Draft or Rejected */}
            {(invoice.status === "DRAFT" || invoice.status === "REJECTED") && (
              <button
                type="button"
                disabled={loading}
                onClick={handleResubmitToFinance}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Submit to Finance
              </button>
            )}

            {/* Finance Actions if authorized and invoice is not Paid */}
            {isFinanceOrAdmin && invoice.status !== "PAID" && activeAction === "NONE" && (
              <>
                {invoice.status === "PENDING_FINANCE" && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleMarkInReview}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-xl transition-all"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Move to In Review
                  </button>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setActiveAction("REJECT")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-all"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Reject
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setActiveAction("PAY")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
