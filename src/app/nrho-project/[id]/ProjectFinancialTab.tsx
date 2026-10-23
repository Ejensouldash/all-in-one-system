"use client"

import { useState } from "react"
import { formatMalaysiaDate } from "@/lib/dateTime"
import { 
  createNrhoPO, 
  createNrhoDO, 
  createNrhoInvoice, 
  updateNrhoInvoiceStatus 
} from "@/app/actions/nrho-project"
import { 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  FileCheck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  X, 
  Calendar, 
  Building, 
  TrendingUp, 
  Receipt,
  FileText,
  BadgeAlert,
  FileSpreadsheet
} from "lucide-react"

interface ProjectFinancialTabProps {
  projectId: string
  project: {
    id: string
    totalBqAmount: number
    totalPoAmount: number
    totalInvoicedAmount: number
    purchaseOrders?: any[]
    deliveryOrders?: any[]
    invoices?: any[]
  }
}

export function ProjectFinancialTab({ projectId, project }: ProjectFinancialTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"PO" | "DO" | "INVOICE">("PO")
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal controls
  const [showPoModal, setShowPoModal] = useState(false)
  const [showDoModal, setShowDoModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  // PO Form State
  const [poNumber, setPoNumber] = useState("")
  const [poVendor, setPoVendor] = useState("")
  const [poAmount, setPoAmount] = useState("")
  const [poNotes, setPoNotes] = useState("")

  // DO Form State
  const [doNumber, setDoNumber] = useState("")
  const [doVendor, setDoVendor] = useState("")
  const [doReceivedBy, setDoReceivedBy] = useState("")
  const [doSummary, setDoSummary] = useState("")
  const [doNotes, setDoNotes] = useState("")

  // Invoice Form State
  const [invNumber, setInvNumber] = useState("")
  const [invVendor, setInvVendor] = useState("")
  const [invAmount, setInvAmount] = useState("")
  const [invDueDate, setInvDueDate] = useState("")
  const [invNotes, setInvNotes] = useState("")

  const purchaseOrders = project.purchaseOrders || []
  const deliveryOrders = project.deliveryOrders || []
  const invoices = project.invoices || []

  // Calculated Variance Metrics
  const totalBq = project.totalBqAmount || 0
  const totalPo = project.totalPoAmount || 0
  const totalInvoiced = project.totalInvoicedAmount || 0
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + (i.amount || 0), 0)
  const totalUnpaid = invoices.filter(i => i.status === "UNPAID").reduce((sum, i) => sum + (i.amount || 0), 0)

  // Budget Variance (BQ - PO Committed)
  const budgetVariance = totalBq - totalPo
  const isOverCommitted = totalPo > totalBq && totalBq > 0

  // Handle Create PO
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poNumber.trim() || !poVendor.trim() || !poAmount) {
      setStatusMsg({ type: "error", text: "Please complete PO Number, Vendor Name, and Amount." })
      return
    }

    setIsSubmitting(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append("poNumber", poNumber)
    formData.append("vendorName", poVendor)
    formData.append("amount", poAmount)
    formData.append("notes", poNotes)

    const res = await createNrhoPO(projectId, formData)
    setIsSubmitting(false)

    if (res.success) {
      setShowPoModal(false)
      setPoNumber("")
      setPoVendor("")
      setPoAmount("")
      setPoNotes("")
      setStatusMsg({ type: "success", text: "Purchase Order (PO) issued successfully!" })
      setTimeout(() => window.location.reload(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to record PO." })
    }
  }

  // Handle Create DO
  const handleCreateDo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doNumber.trim() || !doVendor.trim()) {
      setStatusMsg({ type: "error", text: "Please complete DO Number and Vendor Name." })
      return
    }

    setIsSubmitting(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append("doNumber", doNumber)
    formData.append("vendorName", doVendor)
    formData.append("receivedBy", doReceivedBy)
    formData.append("itemsSummary", doSummary)
    formData.append("notes", doNotes)

    const res = await createNrhoDO(projectId, formData)
    setIsSubmitting(false)

    if (res.success) {
      setShowDoModal(false)
      setDoNumber("")
      setDoVendor("")
      setDoReceivedBy("")
      setDoSummary("")
      setDoNotes("")
      setStatusMsg({ type: "success", text: "Delivery Order (DO) recorded successfully!" })
      setTimeout(() => window.location.reload(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to record DO." })
    }
  }

  // Handle Create Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invNumber.trim() || !invVendor.trim() || !invAmount) {
      setStatusMsg({ type: "error", text: "Please complete Invoice Number, Vendor Name, and Amount." })
      return
    }

    setIsSubmitting(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append("invoiceNumber", invNumber)
    formData.append("vendorName", invVendor)
    formData.append("amount", invAmount)
    formData.append("dueDate", invDueDate)
    formData.append("notes", invNotes)

    const res = await createNrhoInvoice(projectId, formData)
    setIsSubmitting(false)

    if (res.success) {
      setShowInvoiceModal(false)
      setInvNumber("")
      setInvVendor("")
      setInvAmount("")
      setInvDueDate("")
      setInvNotes("")
      setStatusMsg({ type: "success", text: "Vendor invoice recorded successfully!" })
      setTimeout(() => window.location.reload(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to record Invoice." })
    }
  }

  // Handle Toggle Invoice Status
  const handleToggleInvoice = async (invoiceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID"
    setIsSubmitting(true)
    setStatusMsg(null)

    const res = await updateNrhoInvoiceStatus(invoiceId, projectId, newStatus as any)
    setIsSubmitting(false)

    if (res.success) {
      setStatusMsg({ 
        type: "success", 
        text: `Invoice status updated to ${newStatus === "PAID" ? "PAID" : "UNPAID"}.` 
      })
      setTimeout(() => window.location.reload(), 800)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to update invoice status." })
    }
  }

  return (
    <div className="space-y-6">
      {/* Financial Health & Variance KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total BQ */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              BQ Budget Ceiling
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            RM {totalBq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Official cost quotation ceiling</p>
        </div>

        {/* Total PO Committed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              PO Committed Total
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            RM {totalPo.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span>{purchaseOrders.length} Purchase Order{purchaseOrders.length === 1 ? "" : "s"} Issued</span>
          </div>
        </div>

        {/* Total Invoiced & Unpaid */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Invoiced Claims
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            RM {totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-xs mt-1 font-mono">
            <span className="text-emerald-700 font-medium">Paid: RM {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-700 font-medium">Balance: RM {totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Budget Variance */}
        <div className={`border rounded-2xl p-5 shadow-sm ${
          isOverCommitted 
            ? "bg-rose-50 border-rose-200" 
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Budget Balance / Variance
            </span>
            <div className={`p-2 rounded-lg ${
              isOverCommitted ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${
            isOverCommitted ? "text-rose-700" : "text-emerald-700"
          }`}>
            {isOverCommitted ? "- " : "+ "}
            RM {Math.abs(budgetVariance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {isOverCommitted ? "⚠️ PO commitment exceeds BQ allocation!" : "✓ Within approved BQ cost ceiling"}
          </p>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          statusMsg.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-medium">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub Tabs Navigation: PO vs DO vs INVOICE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab("PO")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === "PO"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchase Orders (PO)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === "PO" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("DO")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === "DO"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Delivery Orders (DO)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === "DO" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {deliveryOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("INVOICE")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === "INVOICE"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Vendor Invoices</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === "INVOICE" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {invoices.length}
            </span>
          </button>
        </div>

        {/* Action Button for Active Sub Tab */}
        <div>
          {activeSubTab === "PO" && (
            <button
              onClick={() => setShowPoModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New PO</span>
            </button>
          )}

          {activeSubTab === "DO" && (
            <button
              onClick={() => setShowDoModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Record Site DO</span>
            </button>
          )}

          {activeSubTab === "INVOICE" && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Record Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: PURCHASE ORDERS (PO) */}
      {activeSubTab === "PO" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-600" />
                Purchase Orders Catalog (PO)
              </h3>
              <p className="text-xs text-slate-500">
                Official procurement commitments issued to vendors, subcontractors, and suppliers.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
              Total PO: RM {totalPo.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Purchase Orders Issued Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Record committed orders for materials, machinery rentals, or trade subcontractors.
              </p>
              <button
                onClick={() => setShowPoModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Issue First PO
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Vendor / Contractor</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4 text-right">Amount (RM)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Notes / Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {po.poNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{po.vendorName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatMalaysiaDate(po.issueDate || po.createdAt, "medium")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        RM {po.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {po.status || "ISSUED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {po.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: DELIVERY ORDERS (DO) */}
      {activeSubTab === "DO" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Site Delivery Orders (DO)
              </h3>
              <p className="text-xs text-slate-500">
                Log of physical materials and items received on site for the NRHO project.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              {deliveryOrders.length} Deliveries Logged
            </div>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Delivery Orders Logged Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Record supplier delivery dockets as soon as shipments arrive at the project site.
              </p>
              <button
                onClick={() => setShowDoModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Record First DO
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">DO Number</th>
                    <th className="py-3 px-4">Vendor / Carrier</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4">Site Receiver</th>
                    <th className="py-3 px-4">Item Summary</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryOrders.map((doItem) => (
                    <tr key={doItem.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        {doItem.doNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doItem.vendorName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatMalaysiaDate(doItem.receivedDate || doItem.createdAt, "medium")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {doItem.receivedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-sm">
                        {doItem.itemsSummary || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {doItem.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: INVOICES (INVOIS) */}
      {activeSubTab === "INVOICE" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                Vendor Claim Invoices
              </h3>
              <p className="text-xs text-slate-500">
                Track contractor payment claims, due dates, and update settlement status.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
              Total Invoiced: RM {totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Invoices Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Record supplier progress claim invoices to track cashflow for the NRHO project.
              </p>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Record First Invoice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice No.</th>
                    <th className="py-3 px-4">Vendor / Contractor</th>
                    <th className="py-3 px-4">Invoice Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount (RM)</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "PAID"
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{inv.vendorName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatMalaysiaDate(inv.invoiceDate || inv.createdAt, "medium")}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {inv.dueDate ? formatMalaysiaDate(inv.dueDate, "medium") : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          RM {inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                PAID
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                UNPAID
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleInvoice(inv.id, inv.status)}
                            disabled={isSubmitting}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              isPaid
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isPaid ? "Mark Unpaid" : "Mark as Paid"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE PO */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowPoModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                Issue New Purchase Order (PO)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record committed material or contract purchase orders.
              </p>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PO Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO/NRHO/2026/088"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor / Supplier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mega Steel Supplies Sdn Bhd"
                  value={poVendor}
                  onChange={(e) => setPoVendor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (RM) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={poAmount}
                  onChange={(e) => setPoAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope / Item Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 100 bags of portland cement and waterproofing membrane..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD DO */}
      {showDoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowDoModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Record Delivery Order (DO)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Log physical material received on site.
              </p>
            </div>

            <form onSubmit={handleCreateDo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DO Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. DO-99214"
                  value={doNumber}
                  onChange={(e) => setDoNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor / Supplier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hardware City Supplies"
                  value={doVendor}
                  onChange={(e) => setDoVendor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site Receiving Officer
                </label>
                <input
                  type="text"
                  placeholder="e.g. En. Azman (Site Supervisor)"
                  value={doReceivedBy}
                  onChange={(e) => setDoReceivedBy(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item / Material Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 50 boxes of ceramic tiles 60x60, 10 drums of primer paint..."
                  value={doSummary}
                  onChange={(e) => setDoSummary(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified good condition, no breakages"
                  value={doNotes}
                  onChange={(e) => setDoNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDoModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save DO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD INVOICE */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                Record Vendor Claim Invoice
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record official payment invoices for milestone settlements.
              </p>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-041"
                  value={invNumber}
                  onChange={(e) => setInvNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor / Contractor Company <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Megah Steel Sdn Bhd"
                  value={invVendor}
                  onChange={(e) => setInvVendor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (RM) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Progress Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Progress claim for 50% completion of plumbing rough-in..."
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
