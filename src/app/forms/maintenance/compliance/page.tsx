import { redirect } from "next/navigation"
import { Wrench, ShieldCheck } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getComplianceMonthData } from "@/app/actions/compliance-actions"
import { getMYTDate } from "@/lib/compliance/obligation-calculator"
import { GMPComplianceClient } from "./GMPComplianceClient"

export const metadata = {
  title: "GMP Compliance Calendar & Matrix",
}

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    year?: string
    month?: string
    date?: string
  }>
}

export default async function GMPCompliancePage({ searchParams }: Props) {
  const access = await getAccessInfo()
  if (!access) {
    redirect("/login?callbackUrl=/forms/maintenance/compliance")
  }

  const canCompliance =
    access.isSuperAdmin ||
    hasAnyModule(access, [
      "MAINTENANCE_FORMS",
      "MAINTENANCE_SUMMARY",
      "MAINTENANCE_REPORTS",
      "MAINTENANCE_DASHBOARD",
    ])

  if (!canCompliance) {
    redirect("/forms")
  }

  const sp = await searchParams
  const nowMYT = getMYTDate()
  const currentYear = nowMYT.getFullYear()
  const currentMonth = nowMYT.getMonth() + 1

  const year = sp?.year ? parseInt(sp.year, 10) || currentYear : currentYear
  const month = sp?.month ? parseInt(sp.month, 10) || currentMonth : currentMonth
  const selectedDate = sp?.date || null

  const result = await getComplianceMonthData(year, month)

  if (!result.success || !result.data) {
    return (
      <div className="bg-gray-50 min-h-screen pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-2">
              <Wrench className="h-10 w-10 text-blue-700" />
              <div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                  GMP Dashboard
                </h1>
                <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                  Digitalized Forms &amp; Records
                </p>
              </div>
            </div>
          </div>

          <MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} />

          <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-center font-bold">
            <ShieldCheck className="w-10 h-10 text-red-500 mx-auto mb-2" />
            {result.error || "Ralat memuatkan papan pemuka pematuhan GMP."}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <Wrench className="h-10 w-10 text-blue-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                GMP Dashboard
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Digitalized Forms &amp; Records
              </p>
            </div>
          </div>
        </div>

        <MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} />

        <GMPComplianceClient
          initialData={result.data}
          initialSelectedDate={selectedDate}
        />
      </div>
    </div>
  )
}
