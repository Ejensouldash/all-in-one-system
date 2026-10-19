import { redirect } from "next/navigation"
import { ClipboardList, Wrench, Lightbulb, Trash2, ShieldAlert, Utensils, FlaskConical, Brush, ClipboardCheck, Bug, Droplets, Boxes, BookmarkCheck, RotateCcw } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { MaintenanceFormsGrid } from "./MaintenanceFormsGrid"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { listMyMaintenanceDrafts } from "@/app/actions/maintenance-drafts"
import { draftKeyToSlug } from "./_components/formTypes"

export const metadata = {
  title: "Maintenance Forms",
}

export const dynamic = "force-dynamic"

const qcForms = [
  {
    title: "SGMP/22/PR",
    description: "SGMP/22/PR - Product Recall",
    icon: <RotateCcw className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/product-recall",
    gradient: "from-rose-950 via-red-900 to-slate-900",
    accent: "bg-rose-400"
  },
  {
    title: "SGMP/21/RSR",
    description: "SGMP/21/RSR - Retention Sample Record",
    icon: <BookmarkCheck className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/retention-sample",
    gradient: "from-blue-900 via-indigo-800 to-slate-900",
    accent: "bg-blue-400"
  },
  {
    title: "SGMP/21/FIR",
    description: "SGMP/21/FIR - Finished Goods Product Inspection Record",
    icon: <ShieldAlert className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/finished-goods",
    gradient: "from-red-900 via-red-800 to-rose-900",
    accent: "bg-red-400"
  },
  {
    title: "SGMP/17/CCR",
    description: "SGMP/17/CCR - Chemical Control Records",
    icon: <FlaskConical className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/chemical-control",
    gradient: "from-purple-900 via-purple-800 to-fuchsia-900",
    accent: "bg-purple-400"
  },
  {
    title: "SGMP/18/DQIP",
    description: "SGMP/18/DQIP - Daily Quality In-Process Records",
    icon: <FlaskConical className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/dqip",
    gradient: "from-violet-900 via-violet-800 to-purple-900",
    accent: "bg-violet-400"
  },
  {
    title: "SGMP/18/QCDR",
    description: "SGMP/18/QCDR - QC Daily Report",
    icon: <ClipboardCheck className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/qcdr",
    gradient: "from-emerald-900 via-emerald-800 to-teal-900",
    accent: "bg-emerald-400"
  },
  {
    title: "SGMP/06/PCS",
    description: "SGMP/06/PCS - Pest Control Schedule Form",
    icon: <Bug className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/pcs",
    gradient: "from-lime-900 via-lime-800 to-green-900",
    accent: "bg-lime-400"
  },
  {
    title: "SGMP/06/PCDM",
    description: "SGMP/06/PCDM - Pest Control Daily Monitoring Form",
    icon: <Bug className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/pcdm",
    gradient: "from-lime-900 via-lime-800 to-green-900",
    accent: "bg-lime-400"
  },
  {
    title: "SGMP/06/FTDM",
    description: "SGMP/06/FTDM - Fly Trap Daily Monitoring Form",
    icon: <Bug className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/ftdm",
    gradient: "from-amber-900 via-amber-800 to-orange-900",
    accent: "bg-amber-400"
  },
  {
    title: "SGMP/18/FPIR",
    description: "SGMP/18/FPIR - Finished Product Inspection Record",
    icon: <ShieldAlert className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/fpir",
    gradient: "from-rose-900 via-rose-800 to-pink-900",
    accent: "bg-rose-400"
  },
  {
    title: "SGMP/18/WQTR",
    description: "SGMP/18/WQTR - Water Quality Testing Record",
    icon: <Droplets className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/wqtr",
    gradient: "from-sky-900 via-sky-800 to-cyan-900",
    accent: "bg-sky-400"
  }
]

const productionForms = [
  {
    title: "SGMP/07/WMDR",
    description: "SGMP/07/WMDR - Waste Management Disposal Record",
    icon: <Trash2 className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/waste-management",
    gradient: "from-green-900 via-green-800 to-emerald-900",
    accent: "bg-green-400"
  },
  {
    title: "SGMP/07/WDIR",
    description: "SGMP/07/WDIR - Waste Disposal Inspection Record",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/waste-disposal",
    gradient: "from-teal-900 via-teal-800 to-cyan-900",
    accent: "bg-teal-400"
  },
  {
    title: "SGMP/09/FHDIR",
    description: "SGMP/09/FHDIR - Food Handler Daily Inspection Records",
    icon: <Utensils className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/food-handler",
    gradient: "from-orange-900 via-orange-800 to-amber-900",
    accent: "bg-orange-400"
  },
  {
    title: "SGMP/05",
    description: "SGMP/05 - Cleaning & Sanitization Inspection Records (All Areas)",
    icon: <Brush className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/cleaning",
    gradient: "from-slate-900 via-slate-800 to-slate-900",
    accent: "bg-slate-400"
  },
  {
    title: "SGMP/08/LFCR",
    description: "SGMP/08/LFCR - Lighting Fixtures Cleaning Record",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/lfcr",
    gradient: "from-cyan-900 via-cyan-800 to-sky-900",
    accent: "bg-cyan-400"
  },
  {
    title: "SGMP/12/MGL",
    description: "SGMP/12/MGL - Monthly Glass Log Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/mgl",
    gradient: "from-cyan-900 via-cyan-800 to-sky-900",
    accent: "bg-cyan-400"
  },
  {
    title: "SGMP/12/MGB",
    description: "SGMP/12/MGB - Monthly Glass Breakage Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/mgb",
    gradient: "from-red-900 via-red-800 to-rose-900",
    accent: "bg-red-400"
  },
  {
    title: "SGMP/13/MWL",
    description: "SGMP/13/MWL - Monthly Wood Log Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/mwl",
    gradient: "from-cyan-900 via-cyan-800 to-sky-900",
    accent: "bg-cyan-400"
  },
  {
    title: "SGMP/13/MWB",
    description: "SGMP/13/MWB - Monthly Wood Breakage Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/mwb",
    gradient: "from-red-900 via-red-800 to-rose-900",
    accent: "bg-red-400"
  },
  {
    title: "SGMP/13/MPL",
    description: "SGMP/13/MPL - Monthly Plastic Log Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/mpl",
    gradient: "from-cyan-900 via-cyan-800 to-sky-900",
    accent: "bg-cyan-400"
  },
  {
    title: "SGMP/13/MPB",
    description: "SGMP/13/MPB - Monthly Plastic Breakage Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/mpb",
    gradient: "from-red-900 via-red-800 to-rose-900",
    accent: "bg-red-400"
  },
  {
    title: "SGMP/19/FUV",
    description: "SGMP/19/FUV - Hazard and Process Control Records",
    icon: <Droplets className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/fuv",
    gradient: "from-blue-900 via-cyan-800 to-teal-900",
    accent: "bg-cyan-400"
  },
  {
    title: "WELL FLOWRATE",
    description: "Well Flowrate Monitoring Record (Wells 2, 3, 4, 7, 8, 12)",
    icon: <Droplets className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/well-flowrate",
    gradient: "from-sky-950 via-cyan-900 to-slate-900",
    accent: "bg-cyan-400"
  },
  {
    title: "WATER QUALITY TESTING RO",
    description: "RO Water Quality Testing Record (pH, Turbidity, Colour, Smell, Conductivity & UV)",
    icon: <Droplets className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/water-quality-ro",
    gradient: "from-teal-950 via-cyan-900 to-slate-900",
    accent: "bg-teal-400"
  }
]

const maintenanceForms = [
  {
    title: "SGMP/02/LIR",
    description: "SGMP/02/LIR - Lighting Inspection Records",
    icon: <Lightbulb className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/lighting",
    gradient: "from-yellow-900 via-yellow-800 to-amber-900",
    accent: "bg-yellow-400"
  },
  {
    title: "SGMP/04/MR",
    description: "SGMP/04/MR - Maintenance Record",
    icon: <Wrench className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/maintenance-record",
    gradient: "from-blue-900 via-blue-800 to-indigo-900",
    accent: "bg-blue-400"
  },
  {
    title: "SGMP/03/PMIR",
    description: "SGMP/03/PMIR - Preventive Maintenance Inspection Records",
    icon: <ShieldAlert className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/pmir",
    gradient: "from-indigo-900 via-indigo-800 to-violet-900",
    accent: "bg-indigo-400"
  },
  {
    title: "SGMP/03/PMR",
    description: "SGMP/03/PMR - Preventive Maintenance Records",
    icon: <ShieldAlert className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/pmr",
    gradient: "from-violet-900 via-violet-800 to-purple-900",
    accent: "bg-violet-400"
  },
  {
    title: "SGMP/19/FBSR",
    description: "SGMP/19/FBSR - Filtration Backwash System Records",
    icon: <ClipboardList className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/fbsr",
    gradient: "from-cyan-900 via-cyan-800 to-teal-900",
    accent: "bg-cyan-400"
  }
]

const securityForms = [
  {
    title: "SGMP/14/IVVI",
    description: "SGMP/14/IVVI - Incoming Vehicle Visual Inspection Records",
    icon: <ShieldAlert className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/ivvi",
    gradient: "from-slate-900 via-gray-800 to-zinc-900",
    accent: "bg-slate-400"
  },
  {
    title: "SGMP/14/VCHIF",
    description: "SGMP/14/VCHIF - Vehicle Cleaning & Hygiene Inspection Record",
    icon: <ShieldAlert className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/vchif",
    gradient: "from-slate-900 via-gray-800 to-zinc-900",
    accent: "bg-slate-400"
  }
]

const logisticsForms = [
  {
    title: "PALLET TRANSFER LEDGER",
    description: "Full movement ledger for returnable wooden pallets: issue, return, damage, loss and adjustments.",
    icon: <Boxes className="h-6 w-6 mr-3" />,
    href: "/forms/maintenance/pallet-transfer",
    gradient: "from-amber-950 via-yellow-900 to-stone-900",
    accent: "bg-amber-400",
  },
]

export default async function MaintenanceDashboard() {
  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance")

  const canMaintenanceForms = hasAnyModule(access, ["MAINTENANCE_FORMS"])
  const canPalletLedger = hasAnyModule(access, ["PALLET_LEDGER", "WAREHOUSE"])

  if (!canMaintenanceForms) {
    if (access.modules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    if (access.modules.includes("MAINTENANCE_REPORTS")) {
      redirect("/forms/maintenance/reports")
    }
    if (canPalletLedger) {
      redirect("/forms/maintenance/pallet-transfer")
    }

    redirect("/forms")
  }

  const drafts = canMaintenanceForms ? await listMyMaintenanceDrafts() : { data: [] }
  const draftHrefs = (drafts.data ?? []).map(d => `/forms/maintenance/${draftKeyToSlug(d.formType)}`)

  return (
    <div className="bg-gray-50 pb-12">
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

        <MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} />

        <div className="space-y-12">
          {canPalletLedger && (
            <section>
              <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                  Logistics &amp; Warehouse
                </h2>
              </div>
              <MaintenanceFormsGrid forms={logisticsForms} draftHrefs={draftHrefs} />
            </section>
          )}

          {/* QC Section */}
          {canMaintenanceForms && <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Quality Control (QC)
              </h2>
            </div>
            <MaintenanceFormsGrid forms={qcForms} draftHrefs={draftHrefs} />
          </section>}

          {/* Production Section */}
          {canMaintenanceForms && <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Production
              </h2>
            </div>
            <MaintenanceFormsGrid forms={productionForms} draftHrefs={draftHrefs} />
          </section>}

          {/* Maintenance Section */}
          {canMaintenanceForms && <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Maintenance
              </h2>
            </div>
            <MaintenanceFormsGrid forms={maintenanceForms} draftHrefs={draftHrefs} />
          </section>}

          {/* Security Section */}
          {canMaintenanceForms && <section>
            <div className="mb-6 border-b-2 border-gray-200 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">
                Security
              </h2>
            </div>
            <MaintenanceFormsGrid forms={securityForms} draftHrefs={draftHrefs} />
          </section>}
        </div>
      </div>
    </div>
  )
}
