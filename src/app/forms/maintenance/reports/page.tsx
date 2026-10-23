import { redirect } from "next/navigation"
import Link from "next/link"
import { Wrench, Lightbulb, Trash2, ShieldAlert, Utensils, FlaskConical, ClipboardList, FileSpreadsheet, Brush, ClipboardCheck, Bug, Droplets, BookmarkCheck, RotateCcw, Zap } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"

import { getAccessInfo } from "@/lib/access"

export const metadata = {
  title: "Maintenance Reports",
}

export default async function MaintenanceReportsDashboard() {
  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/reports")

  const { role, modules: userModules } = access
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("GMP_REPORTS") && !userModules.includes("MAINTENANCE_REPORTS")) {
    if (userModules.includes("GMP_FORMS") || userModules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (userModules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    redirect("/dashboard")
  }
  const qcReports = [
    {
      title: "SGMP/22/PR",
      description: "SGMP/22/PR - Product Recall",
      icon: <RotateCcw className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/product-recall",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-rose-400"
    },
    {
      title: "SGMP/21/RSR",
      description: "SGMP/21/RSR - Retention Sample Record",
      icon: <BookmarkCheck className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/retention-sample",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-blue-400"
    },
    {
      title: "SGMP/21/FIR",
      description: "SGMP/21/FIR - Finished Goods Product Inspection Record",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/finished-goods",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-red-400"
    },
    {
      title: "SGMP/17/CCR",
      description: "SGMP/17/CCR - Chemical Control Records",
      icon: <FlaskConical className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/chemical-control",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-purple-400"
    },
    {
      title: "SGMP/18/DQIP",
      description: "SGMP/18/DQIP - Daily Quality In-Process Records",
      icon: <FlaskConical className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/dqip",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-violet-400"
    },
    {
      title: "SGMP/18/QCDR",
      description: "SGMP/18/QCDR - QC Daily Report",
      icon: <ClipboardCheck className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/qcdr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-emerald-400"
    },
    {
      title: "SGMP/06/PCS",
      description: "SGMP/06/PCS - Pest Control Schedule Form",
      icon: <Bug className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pcs",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-lime-400"
    },
    {
      title: "SGMP/06/PCDM",
      description: "SGMP/06/PCDM - Pest Control Daily Monitoring Form",
      icon: <Bug className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pcdm",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-lime-400"
    },
    {
      title: "SGMP/06/FTDM",
      description: "SGMP/06/FTDM - Fly Trap Daily Monitoring Form",
      icon: <Bug className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/ftdm",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-amber-400"
    },
    {
      title: "SGMP/18/FPIR",
      description: "SGMP/18/FPIR - Finished Product Inspection Record",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/fpir",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-rose-400"
    },
    {
      title: "SGMP/18/WQTR",
      description: "SGMP/18/WQTR - Water Quality Testing Record",
      icon: <Droplets className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/wqtr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-sky-400"
    }
  ]

  const productionReports = [
    {
      title: "SGMP/07/WMDR",
      description: "SGMP/07/WMDR - Waste Management Disposal Record",
      icon: <Trash2 className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/waste-management",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-green-400"
    },
    {
      title: "SGMP/07/WDIR",
      description: "SGMP/07/WDIR - Waste Disposal Inspection Record",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/waste-disposal",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-teal-400"
    },
    {
      title: "SGMP/09/FHDIR",
      description: "SGMP/09/FHDIR - Food Handler Daily Inspection Records",
      icon: <Utensils className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/food-handler",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-orange-400"
    },
    {
      title: "SGMP/05",
      description: "SGMP/05 - Cleaning & Sanitization Inspection Records (All Areas)",
      icon: <Brush className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/cleaning",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-slate-400"
    },
    {
      title: "SGMP/08/LFCR",
      description: "SGMP/08/LFCR - Lighting Fixtures Cleaning Record",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/lfcr",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "SGMP/12/MGL",
      description: "SGMP/12/MGL - Monthly Glass Log Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mgl",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "SGMP/12/MGB",
      description: "SGMP/12/MGB - Monthly Glass Breakage Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mgb",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
    {
      title: "SGMP/13/MWL",
      description: "SGMP/13/MWL - Monthly Wood Log Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mwl",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "SGMP/13/MWB",
      description: "SGMP/13/MWB - Monthly Wood Breakage Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mwb",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
    {
      title: "SGMP/13/MPL",
      description: "SGMP/13/MPL - Monthly Plastic Log Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mpl",
      gradient: "from-cyan-900 via-cyan-800 to-sky-900",
      accent: "bg-cyan-400"
    },
    {
      title: "SGMP/13/MPB",
      description: "SGMP/13/MPB - Monthly Plastic Breakage Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/mpb",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
    {
      title: "SGMP/19/FUV",
      description: "SGMP/19/FUV - Hazard and Process Control Records",
      icon: <Droplets className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/fuv",
      gradient: "from-blue-900 via-cyan-800 to-teal-900",
      accent: "bg-cyan-400"
    },
    {
      title: "WELL FLOWRATE",
      description: "Well Flowrate Monitoring Record (Wells 2, 3, 4, 7, 8, 12)",
      icon: <Droplets className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/well-flowrate",
      gradient: "from-sky-950 via-cyan-900 to-slate-900",
      accent: "bg-cyan-400"
    },
    {
      title: "UV MACHINE 3 IN 1 CHECKLIST",
      description: "UV Machine 3 In 1 Daily Records & Machine Status Reports",
      icon: <Zap className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/uv-machine-3-in-1",
      gradient: "from-blue-950 via-indigo-900 to-slate-900",
      accent: "bg-blue-400"
    },
    {
      title: "WATER QUALITY TESTING RO",
      description: "RO Water Quality Testing Record (pH, Turbidity, Colour, Smell, Conductivity & UV)",
      icon: <Droplets className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/water-quality-ro",
      gradient: "from-teal-950 via-cyan-900 to-slate-900",
      accent: "bg-teal-400"
    }
  ]

  const maintenanceReports = [
    {
      title: "SGMP/02/LIR",
      description: "SGMP/02/LIR - Lighting Inspection Records",
      icon: <Lightbulb className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/lighting",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-yellow-400"
    },
    {
      title: "SGMP/04/MR",
      description: "SGMP/04/MR - Maintenance Record",
      icon: <Wrench className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/maintenance-record",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-blue-400"
    },
    {
      title: "SGMP/03/PMIR",
      description: "SGMP/03/PMIR - Preventive Maintenance Inspection Records",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pmir",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-indigo-400"
    },
    {
      title: "SGMP/03/PMR",
      description: "SGMP/03/PMR - Preventive Maintenance Records",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/pmr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-violet-400"
    },
    {
      title: "SGMP/19/FBSR",
      description: "SGMP/19/FBSR - Filtration Backwash System Records",
      icon: <ClipboardList className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/fbsr",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-cyan-400"
    }
  ]

  const securityReports = [
    {
      title: "SGMP/14/IVVI",
      description: "SGMP/14/IVVI - Incoming Vehicle Visual Inspection Records",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/reports/ivvi",
      gradient: "from-slate-900 via-slate-800 to-zinc-900",
      accent: "bg-slate-400"
    },
    {
      title: "SGMP/14/VCHIF",
      description: "SGMP/14/VCHIF - Vehicle Cleaning & Hygiene Inspection Record",
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
                GMP Dashboard
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
