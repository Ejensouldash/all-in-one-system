import Link from "next/link"
import { getAllNrhoFinancialOverview } from "@/app/actions/nrho-project"
import { 
  DollarSign, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  ShoppingCart, 
  Truck, 
  Receipt,
  TrendingUp,
  ExternalLink,
  Plus
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Procurement & Finance | NRHO Project",
  description: "Cross-project financial control: Purchase Orders, Delivery Orders, and Claim Invoices.",
}

export default async function NrhoFinancialOverviewPage() {
  const res = await getAllNrhoFinancialOverview()
  const projects = res.success && res.data ? res.data : []

  const totalBqAll = projects.reduce((sum, p) => sum + (p.totalBqAmount || 0), 0)
  const totalPoAll = projects.reduce((sum, p) => sum + (p.totalPoAmount || 0), 0)
  const totalInvoicedAll = projects.reduce((sum, p) => sum + (p.totalInvoicedAmount || 0), 0)
  const totalBalance = totalBqAll - totalPoAll

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/nrho-project"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to NRHO Projects Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold uppercase tracking-wider">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Procurement &amp; Financial Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Procurement &amp; Finance Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Consolidated ledger tracking Purchase Orders (PO), Site Delivery Orders (DO), and Contractor Claim Invoices against approved BQ budget ceilings.
          </p>
        </div>
      </div>

      {/* Macro Financial Variance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total BQ Ceiling</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            RM {totalBqAll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total approved quotation estimates</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">PO Committed Total</span>
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-700">
            RM {totalPoAll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Committed purchase orders</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Invoiced</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">
            RM {totalInvoicedAll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Vendor claims submitted</p>
        </div>

        <div className={`border rounded-2xl p-5 shadow-sm ${
          totalBalance < 0 
            ? "bg-rose-50 border-rose-200" 
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Overall Variance</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={`text-2xl font-black font-mono ${
            totalBalance < 0 ? "text-rose-700" : "text-emerald-700"
          }`}>
            {totalBalance < 0 ? "- " : "+ "}
            RM {Math.abs(totalBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {totalBalance < 0 ? "Commitments exceed budget" : "Within approved BQ budget"}
          </p>
        </div>
      </div>

      {/* Projects Financial Breakdown */}
      <div className="space-y-6">
        {projects.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Financial Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Register a project to issue Purchase Orders and record Delivery Orders and Invoices.
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Project Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {project.projectCode}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                  </div>
                  {project.siteLocation && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{project.siteLocation}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">BQ Ceiling</span>
                      <span className="font-bold text-slate-900">RM {project.totalBqAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-700 block uppercase font-semibold">PO Total</span>
                      <span className="font-bold text-purple-700">RM {project.totalPoAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 block uppercase font-semibold">Invoiced</span>
                      <span className="font-bold text-amber-700">RM {project.totalInvoicedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <Link
                    href={`/nrho-project/${project.id}?tab=financial`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                  >
                    <span>Manage Finance</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Counts & Highlights */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                    <span className="text-slate-700 font-medium">Purchase Orders (PO)</span>
                  </div>
                  <span className="font-mono font-bold text-purple-700">
                    {project.purchaseOrders.length}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-700 font-medium">Site Deliveries (DO)</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">
                    {project.deliveryOrders.length}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-700 font-medium">Claim Invoices</span>
                  </div>
                  <span className="font-mono font-bold text-amber-700">
                    {project.invoices.length} ({project.invoices.filter((i: any) => i.status === "PAID").length} Paid)
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
