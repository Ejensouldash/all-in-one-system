import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wrench, Lightbulb, Trash2, ShieldAlert, Utensils, FlaskConical, ClipboardList, FileSpreadsheet, Brush, ClipboardCheck, Bug } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"

import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "Maintenance Reports",
}

export default async function MaintenanceReportsDashboard() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true }
  })

  const role = dbUser?.role || (session.user as any).trueRole || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("MAINTENANCE_REPORTS")) {
    if (userModules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (userModules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    redirect("/dashboard")
  }
  const qcReports = [
    {
      title: "Finished Goods Reports",
      description: "View and print damage logs for finished goods packaging.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/finished-goods",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-red-400"
    },
    {
      title: "Chemical Control Logs",
      description: "View and print logs for chemical collections and returns.",
      icon: <FlaskConical className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/chemical-control",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-purple-400"
    },
    {
      title: "Daily Quality In-Process Reports",
      description: "SGMP-18: View and print in-process weight, condition, and sensory sample records.",
      icon: <FlaskConical className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/dqip",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-violet-400"
    },
    {
      title: "QC Daily Reports",
      description: "SGMP-18: View and print quality control daily activity reports.",
      icon: <ClipboardCheck className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/qcdr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-emerald-400"
    }
  ]

  const productionReports = [
    {
      title: "Waste Management Reports",
      description: "View and print recycling and disposal records.",
      icon: <Trash2 className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/waste-management",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-green-400"
    },
    {
      title: "Waste Disposal Checklists",
      description: "View and print daily disposal area checklists.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/waste-disposal",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-teal-400"
    },
    {
      title: "Food Handler Reports",
      description: "View and print employee hygiene logs.",
      icon: <Utensils className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/food-handler",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-orange-400"
    },
    {
      title: "Pest Control Schedule Reports",
      description: "View and print 3rd-party pest control service visit history.",
      icon: <Bug className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pcs",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-lime-400"
    },
    {
      title: "Pest Control Daily Monitoring Reports",
      description: "View and print daily bait station monitoring records.",
      icon: <Bug className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pcdm",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-lime-400"
    },
    {
      title: "Fly Trap Daily Monitoring Reports",
      description: "View and print daily fly trap station monitoring records.",
      icon: <Bug className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/ftdm",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-amber-400"
    },
    {
      title: "Cleaning Inspection Reports",
      description: "View and print floor cleaning checklist records.",
      icon: <Brush className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/cleaning",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-slate-400"
    },
    {
      title: "LFCR Reports",
      description: "View and print lighting fixtures cleaning records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/lfcr",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "MGL Reports",
      description: "View and print monthly glass log records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mgl",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "MGB Reports",
      description: "View and print monthly glass breakage records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mgb",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
    {
      title: "MWL Reports",
      description: "View and print monthly wood log records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mwl",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "MWB Reports",
      description: "View and print monthly wood breakage records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mwb",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
    {
      title: "MPL Reports",
      description: "View and print monthly plastic log records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mpl",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "MPB Reports",
      description: "View and print monthly plastic breakage records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mpb",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    }
  ]

  const maintenanceReports = [
    {
      title: "Lighting Inspection Reports",
      description: "View and print lighting inspection logs by date.",
      icon: <Lightbulb className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/lighting",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-yellow-400"
    },
    {
      title: "Maintenance Equipment Reports",
      description: "SGMP-04: View and print maintenance equipment records.",
      icon: <Wrench className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/maintenance-record",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-blue-400"
    },
    {
      title: "PMIR Reports",
      description: "SGMP-03: View and print preventive maintenance inspection records.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pmir",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-indigo-400"
    },
    {
      title: "PMR Reports",
      description: "SGMP-03: View and print preventive maintenance records.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pmr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-violet-400"
    },
    {
      title: "Filtration Backwash Reports",
      description: "SGMP-19: View and print filtration backwash system records.",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/fbsr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-cyan-400"
    }
  ]

  const securityReports = [
    {
      title: "IVVI Reports",
      description: "SGMP-14: View and print incoming vehicle visual inspection records.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/ivvi",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-slate-400"
    },
    {
      title: "VCHIF Reports",
      description: "SGMP-14: View and print vehicle cleaning & hygiene inspection records.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/vchif",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-slate-400"
    }
  ]

  const ReportGrid = ({ reports }: { reports: any[] }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
      {reports.map((report, index) => (
        <div key={index} className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-shadow">
          <div className="mb-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-widest mb-4">
              <span className={`w-2.5 h-2.5 rounded-full ${report.accent} mr-2`}></span>
              Report Section
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">{report.title}</h2>
            <p className="text-gray-500 text-sm font-medium">
              {report.description}
            </p>
          </div>
          <Link href={report.href} className="group flex items-center justify-center w-full bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition-colors shadow-md uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> View Reports
          </Link>
        </div>
      ))}
    </div>
  )

  return (
    <div className="bg-gray-50 pb-12 min-h-screen">
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

        <MaintenanceTabs userModules={userModules} />

        <div className="space-y-12">
          {/* QC Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Quality Control (QC)
              </h2>
            </div>
            <ReportGrid reports={qcReports} />
          </section>

          {/* Production Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Production
              </h2>
            </div>
            <ReportGrid reports={productionReports} />
          </section>

          {/* Maintenance Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Maintenance
              </h2>
            </div>
            <ReportGrid reports={maintenanceReports} />
          </section>

          {/* Security Section */}
          <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Security
              </h2>
            </div>
            <ReportGrid reports={securityReports} />
          </section>
        </div>
      </div>
    </div>
  )
}
