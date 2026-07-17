import { redirect } from "next/navigation"
import { ClipboardList, Wrench, Lightbulb, Trash2, ShieldAlert, Utensils, FlaskConical, Brush } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { MaintenanceFormsGrid } from "./MaintenanceFormsGrid"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export const metadata = {
  title: "Maintenance Forms",
}

export const dynamic = "force-dynamic"

export default async function MaintenanceDashboard() {
  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance")

  if (!hasAnyModule(access, ["MAINTENANCE_FORMS"])) {
    if (access.modules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    if (access.modules.includes("MAINTENANCE_REPORTS")) {
      redirect("/forms/maintenance/reports")
    }

    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  const qcForms = [
    {
      title: "Finished Goods Inspection",
      description: "Record damaged boxes for 425ML and 800ML finished goods.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/finished-goods",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
    {
      title: "Chemical Control",
      description: "Log chemical usage, code names, and return times.",
      icon: <FlaskConical className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/chemical-control",
      gradient: "from-purple-900 via-purple-800 to-fuchsia-900",
      accent: "bg-purple-400"
    }
  ]

  const productionForms = [
    {
      title: "Waste Management",
      description: "Record weights and disposal actions for recycle and disposal materials.",
      icon: <Trash2 className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/waste-management",
      gradient: "from-green-900 via-green-800 to-emerald-900",
      accent: "bg-green-400"
    },
    {
      title: "Waste Disposal Inspection",
      description: "Daily checklist for feeder, label, filling, packaging, and changing rooms.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/waste-disposal",
      gradient: "from-teal-900 via-teal-800 to-cyan-900",
      accent: "bg-teal-400"
    },
    {
      title: "Food Handler Inspection",
      description: "Daily employee hygiene and PPE inspection checklist.",
      icon: <Utensils className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/food-handler",
      gradient: "from-orange-900 via-orange-800 to-amber-900",
      accent: "bg-orange-400"
    },
    {
      title: "Cleaning Inspection",
      description: "Daily checklist for production floor cleaning across sections and lines.",
      icon: <Brush className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/cleaning",
      gradient: "from-slate-900 via-slate-800 to-slate-900",
      accent: "bg-slate-400"
    }
  ]

  const maintenanceForms = [
    {
      title: "Lighting Inspection",
      description: "Log daily or weekly lighting inspection records across all coverage areas.",
      icon: <Lightbulb className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/lighting",
      gradient: "from-yellow-900 via-yellow-800 to-amber-900",
      accent: "bg-yellow-400"
    },
    {
      title: "Maintenance Equipment",
      description: "SGMP-04: Daily checklist for maintenance equipment statuses.",
      icon: <Wrench className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/maintenance-record",
      gradient: "from-blue-900 via-blue-800 to-indigo-900",
      accent: "bg-blue-400"
    },
    {
      title: "PMIR",
      description: "SGMP-03: Preventive Maintenance Inspection Records.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/pmir",
      gradient: "from-indigo-900 via-indigo-800 to-violet-900",
      accent: "bg-indigo-400"
    },
    {
      title: "PMR",
      description: "SGMP-03: Preventive Maintenance Records.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/pmr",
      gradient: "from-violet-900 via-violet-800 to-purple-900",
      accent: "bg-violet-400"
    },
    {
      title: "Filtration Backwash",
      description: "SGMP-19: Filtration Backwash System Records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/fbsr",
      gradient: "from-cyan-900 via-cyan-800 to-teal-900",
      accent: "bg-cyan-400"
    }
  ]

  return (
    <div className="bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <Wrench className="h-10 w-10 text-blue-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                Maintenance Dashboard
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Digitalized Forms & Records
              </p>
            </div>
          </div>
        </div>

        <MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} />

        <div className="space-y-12">
          {/* QC Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Quality Control (QC)
              </h2>
            </div>
            <MaintenanceFormsGrid forms={qcForms} />
          </section>

          {/* Production Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Production
              </h2>
            </div>
            <MaintenanceFormsGrid forms={productionForms} />
          </section>

          {/* Maintenance Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Maintenance
              </h2>
            </div>
            <MaintenanceFormsGrid forms={maintenanceForms} />
          </section>
        </div>
      </div>
    </div>
  )
}
