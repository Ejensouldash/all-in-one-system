import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { LayoutDashboard } from "lucide-react"
import { FormsAnalyticsClient } from "@/components/forms/FormsAnalyticsClient"
import { AnalyticsRangePicker } from "@/components/forms/AnalyticsRangePicker"
import { GenerateReportButton } from "@/components/forms/GenerateReportButton"
import { computeProductionAnalytics } from "@/lib/analytics/compute"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] }
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

  const data = await computeProductionAnalytics(from, to)

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
          <GenerateReportButton from={from} to={to} />
        </div>
      </div>

      <FormsAnalyticsClient data={data} />
    </div>
  )
}
