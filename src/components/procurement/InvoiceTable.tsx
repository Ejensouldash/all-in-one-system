"use client"

import {
  FileText,
  Clock,
  ExternalLink,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Building,
  Paperclip,
  Edit2,
  Trash2,
} from "lucide-react"
import {
  INVOICE_STATUS_CONFIG,
  PAYMENT_TERMS_CONFIG,
} from "./procurement-constants"

interface InvoiceTableProps {
  invoices: any[]
  loading: boolean
  onSelectInvoice: (invoice: any) => void
  onEditInvoice: (invoice: any) => void
  onDeleteInvoice: (id: string, invoiceNumber: string) => void
  onOpenNewModal: () => void
}

export function InvoiceTable({
  invoices,
  loading,
  onSelectInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onOpenNewModal,
}: InvoiceTableProps) {
  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Loading documents...</p>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Receipt className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">No documents found</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No records match the current filter or category. Click below to create a new document submission.
        </p>
        <button
          onClick={onOpenNewModal}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
        >
          New Submission
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              <th className="py-3.5 px-3 text-center">#</th>
              <th className="py-3.5 px-4">Company & Dept</th>
              <th className="py-3.5 px-4">Supplier</th>
              <th className="py-3.5 px-4">Invoice & PO No</th>
              <th className="py-3.5 px-4">Submit Date</th>
              <th className="py-3.5 px-4 text-right">Amount (RM)</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {invoices.map((inv, index) => {
              const statusCfg = INVOICE_STATUS_CONFIG[inv.status] || {
                label: inv.status,
                badgeClass: "bg-slate-100 text-slate-700",
                dotClass: "bg-slate-400",
              }

              return (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Row Number */}
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">
                    {index + 1}
                  </td>

                  {/* Company & Department */}
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] mr-1">
                      {inv.company}
                    </span>
                    <span className="text-slate-600 truncate max-w-[140px] inline-block align-middle font-medium" title={inv.department}>
                      {inv.department}
                    </span>
                  </td>

                  {/* Supplier */}
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[170px]" title={inv.supplier?.name}>
                        {inv.supplier?.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Terms: {PAYMENT_TERMS_CONFIG[inv.supplier?.terms]?.label || inv.supplier?.terms}
                      </span>
                    </div>
                  </td>

                  {/* Invoice & PO No */}
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{inv.invoiceNumber}</span>
                      {(() => {
                        const count = Array.isArray(inv.attachments) && inv.attachments.length > 0
                          ? inv.attachments.length
                          : inv.attachmentUrl ? 1 : 0
                        if (count === 0) return null
                        return (
                          <span
                            title={`${count} attached file(s)`}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200"
                          >
                            <Paperclip className="w-2.5 h-2.5" />
                            {count}
                          </span>
                        )
                      })()}
                    </div>
                    {inv.poNumber && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        PO: {inv.poNumber}
                      </div>
                    )}
                  </td>

                  {/* Submit Date */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {new Date(inv.submitDate || inv.createdAt).toLocaleDateString()}
                  </td>

                  {/* Amount (RM) */}
                  <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                    {inv.category === "DEPOSIT_PAYMENT" && (inv.depositDetails?.totalPrice || inv.totalPrice) ? (
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900 text-xs">
                          Total: RM {Number(inv.depositDetails?.totalPrice || inv.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
                            Paid: RM {Number(inv.depositDetails?.totalPaid || inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-amber-800 font-semibold bg-amber-50 px-1 rounded border border-amber-200">
                            Baki: RM {Number(inv.depositDetails?.remainingBalance ?? ((inv.depositDetails?.totalPrice || inv.totalPrice || 0) - (inv.depositDetails?.totalPaid || inv.amount || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-900">
                        RM {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* Actions: View, Edit, Delete */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Submission"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteInvoice(inv.id, inv.invoiceNumber)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Submission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
