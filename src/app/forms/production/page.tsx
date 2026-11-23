import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardList, PackagePlus } from "lucide-react"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { ProductionReportsTable } from "@/components/forms/ProductionReportsTable"
import { ProductionReportFilters } from "@/components/forms/ProductionReportFilters"

export const metadata = {
  title: "Production Dashboard",
}

interface FilterParams {
  currentPage: number
  pageSize: number
  q?: string
  month?: string
  from?: string
  to?: string
  shift?: string
  line?: string
  status?: string
}

async function AsyncReportsTable({
  currentPage,
  pageSize,
  q,
  month,
  from,
  to,
  shift,
  line,
  status,
}: FilterParams) {
  const whereClause: any = {}

  // Date filtering: By Month or Custom Date Range
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yearStr, monthStr] = month.split("-")
    const year = parseInt(yearStr, 10)
    const monthNum = parseInt(monthStr, 10)
    const lastDay = new Date(year, monthNum, 0).getDate()
    const start = new Date(`${month}-01T00:00:00.000Z`)
    const end = new Date(`${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`)
    whereClause.date = { gte: start, lte: end }
  } else if (from || to) {
    whereClause.date = {}
    if (from) {
      whereClause.date.gte = new Date(`${from}T00:00:00.000Z`)
    }
    if (to) {
      whereClause.date.lte = new Date(`${to}T23:59:59.999Z`)
    }
  }

  // Shift filter
  if (shift && shift !== "ALL") {
    whereClause.shift = shift
  }

  // Line filter
  if (line && line !== "ALL") {
    whereClause.line = { contains: line, mode: "insensitive" }
  }

  // Status filter
  if (status && status !== "ALL") {
    whereClause.status = status
  }

  // Comprehensive Search (Prepared By, Remarks, and Batch Numbers)
  if (q) {
    whereClause.OR = [
      { preparedBy: { contains: q, mode: "insensitive" } },
      { remarks: { contains: q, mode: "insensitive" } },
      {
        productions: {
          some: {
            batches: {
              some: {
                batchNo: { contains: q, mode: "insensitive" },
              },
            },
          },
        },
      },
      {
        inventory: {
          some: {
            batchNo: { contains: q, mode: "insensitive" },
          },
        },
      },
    ]
  }

  const [totalReports, reports] = await Promise.all([
    prisma.dailyReport.count({ where: whereClause }),
    prisma.dailyReport.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        date: true,
        time: true,
        shift: true,
        line: true,
        preparedBy: true,
        status: true,
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize))
  const hasFilters = Boolean(q || month || from || to || shift || line || status)

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center mb-12">
        <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-bold text-gray-900">
          {hasFilters ? "No Matching Reports" : "No Reports Found"}
        </h3>
        <p className="text-gray-500 mt-1 max-w-md text-sm">
          {hasFilters
            ? "No submitted daily reports matched your search or filter criteria. Try adjusting your parameters or reset filters."
            : "Production reports submitted via the KAR Daily Report will appear here."}
        </p>
        {hasFilters && (
          <Link
            href="/forms/production"
            className="mt-4 inline-flex items-center px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            Clear All Filters
          </Link>
        )}
      </div>
    )
  }

  return (
    <ProductionReportsTable
      reports={reports}
      totalReports={totalReports}
      currentPage={currentPage}
      pageSize={pageSize}
      totalPages={totalPages}
    />
  )
}

function ReportsTableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4 animate-pulse mb-12">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-12 bg-gray-100 rounded w-full"></div>
      <div className="h-12 bg-gray-100 rounded w-full"></div>
      <div className="h-12 bg-gray-100 rounded w-full"></div>
    </div>
  )
}

interface PageProps {
  searchParams?: Promise<{
    page?: string
    pageSize?: string
    q?: string
    month?: string
    from?: string
    to?: string
    shift?: string
    line?: string
    status?: string
  }>
}

export default async function ProductionDashboard(props: PageProps) {
  const resolvedParams = await props.searchParams
  const currentPage = Math.max(1, parseInt(resolvedParams?.page || "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(resolvedParams?.pageSize || "10", 10) || 10))
  const q = resolvedParams?.q?.trim() || ""
  const month = resolvedParams?.month?.trim() || ""
  const from = resolvedParams?.from?.trim() || ""
  const to = resolvedParams?.to?.trim() || ""
  const shift = resolvedParams?.shift?.trim() || ""
  const line = resolvedParams?.line?.trim() || ""
  const status = resolvedParams?.status?.trim() || ""

  // Check module access with live DB data (Superadmin gets all by default)
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["FORMS"])) {
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  const hasHandoverAccess = hasAnyModule(access, ["HANDOVER"])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-2">
            <ClipboardList className="h-10 w-10 text-indigo-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                Production Dashboard
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Forms & Logging
              </p>
            </div>
          </div>
        </div>

        <FormsTabs role={access.isSuperAdmin ? "SUPERADMIN" : access.role} />

        {/* Module CTAs */}
        <div className={`grid grid-cols-1 ${hasHandoverAccess ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8 mb-12`}>
          
          <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-amber-700/50 hover:-translate-y-1 transition-transform">
            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-100 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>
                Raw Materials
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Transfer In Forms</h2>
              <p className="text-amber-200 text-base font-medium max-w-md">
                Log real-time Delivery Orders (DO) for raw materials as they arrive from suppliers.
              </p>
            </div>
            <Link href="/forms/production/transfer-in" className="group flex items-center justify-center w-full bg-white text-amber-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-amber-50 transition-colors shadow-lg uppercase tracking-wider">
              <PackagePlus className="h-6 w-6 mr-3" /> Log Incoming Stock
            </Link>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-indigo-700/50 hover:-translate-y-1 transition-transform">
            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                Production Module
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Daily KAR</h2>
              <p className="text-indigo-200 text-base font-medium max-w-md">
                End-of-shift production logs, auto-syncing carry forward inventory to the warehouse.
              </p>
            </div>
            <Link href="/forms/production/daily-report" className="group flex items-center justify-center w-full bg-white text-indigo-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-indigo-50 transition-colors shadow-lg uppercase tracking-wider">
              <ClipboardList className="h-6 w-6 mr-3" /> Start Shift Report
            </Link>
          </div>

          {hasHandoverAccess && (
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-700/50 hover:-translate-y-1 transition-transform">
              <div className="relative z-10 mb-8">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                  Finished Goods
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Handover Form</h2>
                <p className="text-emerald-200 text-base font-medium max-w-md">
                  Nota Serahan Produksi to transfer finished goods to the warehouse and log direct deductions.
                </p>
              </div>
              <Link href="/forms/production/handover/new" className="group flex items-center justify-center w-full bg-white text-emerald-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-emerald-50 transition-colors shadow-lg uppercase tracking-wider">
                <ClipboardList className="h-6 w-6 mr-3" /> Create Handover
              </Link>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between mt-12">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <ClipboardList className="w-6 h-6 mr-3 text-indigo-600" />
            Submitted Daily Reports
          </h2>
        </div>
        
        {/* Search, Divide by Month & Multi-Filter Bar */}
        <ProductionReportFilters
          currentFilters={{
            q,
            month,
            from,
            to,
            shift,
            line,
            status,
            pageSize,
          }}
        />

        <Suspense key={JSON.stringify(resolvedParams || {})} fallback={<ReportsTableSkeleton />}>
          <AsyncReportsTable
            currentPage={currentPage}
            pageSize={pageSize}
            q={q}
            month={month}
            from={from}
            to={to}
            shift={shift}
            line={line}
            status={status}
          />
        </Suspense>

      </div>
    </div>
  )
}
