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
} from "lucide-react"
import {
  INVOICE_STATUS_CONFIG,
  INVOICE_CATEGORY_CONFIG,
  PAYMENT_TERMS_CONFIG,
} from "./procurement-constants"

interface InvoiceTableProps {
  invoices: any[]
  loading: boolean
  onSelectInvoice: (invoice: any) => void
  onOpenNewModal: () => void
}

export function InvoiceTable({
  invoices,
  loading,
  onSelectInvoice,
  onOpenNewModal,
}: InvoiceTableProps) {
  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Loading invoices...</p>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Receipt className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">No invoices in this category</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No records match the current filter or category. Click below to raise a new invoice for payment.
        </p>
        <button
          onClick={onOpenNewModal}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
        >
          Raise New Invoice
        </button>
      </div>
    )
  }

  const now = new Date()

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
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4 text-right">Amount (RM)</th>
              <th className="py-3.5 px-4 text-center">Doc Status</th>
              <th className="py-3.5 px-4 text-center">Category</th>
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
              const catCfg = INVOICE_CATEGORY_CONFIG[inv.category] || {
                label: inv.category,
                short: inv.category,
                badgeClass: "bg-slate-100 text-slate-700",
              }

              const isCash = inv.category === "CASH_PREPAYMENT"

              // Due Date Check
              let isOverdue = false
              let isDueSoon = false
              if (inv.dueDate && inv.status !== "PAID" && inv.status !== "REJECTED") {
                const due = new Date(inv.dueDate)
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                if (diffDays < 0) {
                  isOverdue = true
                } else if (diffDays <= 3) {
                  isDueSoon = true
                }
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
                    <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
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

                  {/* Due Date */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {inv.dueDate ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-medium ${
                            isOverdue
                              ? "text-rose-600 font-bold"
                              : isDueSoon
                              ? "text-amber-600 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-700 font-bold uppercase">
                            Overdue
                          </span>
                        )}
                        {isDueSoon && !isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-700 font-bold uppercase">
                            Due Soon
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Immediate / CBD</span>
                    )}
                  </td>

                  {/* Amount (RM) */}
                  <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                    RM {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Physical Doc Status */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <span
                        title="Delivery Order"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inv.doReceived
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        DO: {inv.doReceived ? "YES" : "NO"}
                      </span>
                      <span
                        title="Original Invoice"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inv.originalInvoiceReceived
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        INV: {inv.originalInvoiceReceived ? "YES" : "NO"}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {isCash ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Urgent Prepay
                      </span>
                    ) : (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${catCfg.badgeClass}`}
                      >
                        {catCfg.short}
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

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectInvoice(inv)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
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
