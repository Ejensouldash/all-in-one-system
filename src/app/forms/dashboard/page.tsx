import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { LayoutDashboard } from "lucide-react"
import { FormsAnalyticsClient } from "@/components/forms/FormsAnalyticsClient"
import { AnalyticsRangePicker } from "@/components/forms/AnalyticsRangePicker"
import { GenerateReportButton } from "@/components/forms/GenerateReportButton"
import { ExportStoreroomButton } from "@/components/forms/ExportStoreroomButton"
import { computeProductionAnalytics } from "@/lib/analytics/compute"
import { getStoreroomReport } from "@/lib/analytics/storeroom"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] }
}

async function AsyncFormsAnalytics({ from, to }: { from: string; to: string }) {
  const [data, storeroom] = await Promise.all([
    computeProductionAnalytics(from, to),
    getStoreroomReport(to),
  ])

  return <FormsAnalyticsClient data={data} storeroom={storeroom} />
}

function AnalyticsSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6 animate-pulse mt-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-24 bg-gray-100 rounded-xl"></div>
        <div className="h-24 bg-gray-100 rounded-xl"></div>
        <div className="h-24 bg-gray-100 rounded-xl"></div>
        <div className="h-24 bg-gray-100 rounded-xl"></div>
      </div>
      <div className="h-96 bg-gray-100 rounded-xl"></div>
    </div>
  )
}

export default async function FormsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const params = await searchParams
  const fallback = defaultRange()
  const rawFrom = typeof params.from === "string" ? params.from : ""
  const rawTo = typeof params.to === "string" ? params.to : ""

  let from = ISO_DATE.test(rawFrom) ? rawFrom : fallback.from
  let to = ISO_DATE.test(rawTo) ? rawTo : fallback.to
  if (from > to) [from, to] = [to, from]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-in fade-in duration-500 pb-12">
      <FormsTabs role={user.trueRole || user.role} />

      <div className="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <LayoutDashboard className="w-6 h-6 mr-3 text-indigo-600" />
            Forms Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Analisis pengeluaran, kualiti, downtime dan kepatuhan borang.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <AnalyticsRangePicker from={from} to={to} />
          <div className="flex items-start gap-2">
            <GenerateReportButton from={from} to={to} />
            <ExportStoreroomButton asOf={to} />
          </div>
        </div>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AsyncFormsAnalytics from={from} to={to} />
      </Suspense>
    </div>
  )
}
