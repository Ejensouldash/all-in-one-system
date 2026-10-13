import Link from "next/link"
import { getAllNrhoBqOverview } from "@/app/actions/nrho-project"
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  ChevronRight, 
  Plus, 
  ExternalLink,
  DollarSign
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Quotations & Bill of Quantities (BQ) | NRHO Project",
  description: "Cross-project Bill of Quantities schedules, rates, and quotation estimates.",
}

export default async function NrhoBqOverviewPage() {
  const res = await getAllNrhoBqOverview()
  const projects = res.success && res.data ? res.data : []

  const totalBqAllProjects = projects.reduce((sum, p) => sum + (p.totalBqAmount || 0), 0)
  const totalBqItems = projects.reduce((sum, p) => sum + (p.bqItems?.length || 0), 0)

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Bill of Quantities (BQ) Master Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Project Quotations &amp; BQ Estimates
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Consolidated overview of all Bill of Quantities estimates across active and proposed NRHO projects.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total BQ Across All Projects
          </span>
          <span className="text-2xl font-black font-mono text-emerald-700">
            RM {totalBqAllProjects.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">
            {totalBqItems} Line items across {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Projects BQ Breakdown */}
      <div className="space-y-6">
        {projects.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No BQ Schedules Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Register a project to begin building itemized Bill of Quantities schedules.
            </p>
            <Link
              href="/nrho-project/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-xl inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Project BQ Header */}
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
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total BQ Ceiling</span>
                    <span className="font-mono font-black text-sm text-emerald-700">
                      RM {project.totalBqAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <Link
                    href={`/nrho-project/${project.id}?tab=bq`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                  >
                    <span>Edit BQ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* BQ Items Preview Table */}
              <div className="p-4">
                {project.bqItems.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No line items added yet for this project.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-800">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                          <th className="py-2.5 px-3 text-center">Unit</th>
                          <th className="py-2.5 px-3 text-right">Rate (RM)</th>
                          <th className="py-2.5 px-3 text-right">Amount (RM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {project.bqItems.slice(0, 5).map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{item.category}</td>
                            <td className="py-2 px-3 text-slate-700">{item.description}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-800">{item.quantity}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">{item.unit}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-800">
                              {item.unitRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              RM {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {project.bqItems.length > 5 && (
                      <div className="pt-2 text-center">
                        <Link
                          href={`/nrho-project/${project.id}?tab=bq`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          View all {project.bqItems.length} line items →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
