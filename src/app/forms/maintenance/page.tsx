import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardList, Wrench, Lightbulb, Trash2, ShieldAlert, Utensils, FlaskConical } from "lucide-react"
import { FormsTabs } from "@/components/forms/FormsTabs"

export const metadata = {
  title: "Maintenance Forms",
}

export default async function MaintenanceDashboard() {
  const session = await auth()
  if (!session) redirect("/login")

  const role = (session.user as any).trueRole || session.user.role

  const forms = [
    {
      title: "Lighting Inspection",
      description: "Log daily or weekly lighting inspection records across all coverage areas.",
      icon: <Lightbulb className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/lighting",
      gradient: "from-yellow-900 via-yellow-800 to-amber-900",
      accent: "bg-yellow-400"
    },
    {
      title: "Finished Goods Inspection",
      description: "Record damaged boxes for 425ML and 800ML finished goods.",
      icon: <ShieldAlert className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/finished-goods",
      gradient: "from-red-900 via-red-800 to-rose-900",
      accent: "bg-red-400"
    },
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
      title: "Chemical Control",
      description: "Log chemical usage, code names, and return times.",
      icon: <FlaskConical className="h-6 w-6 mr-3" />,
      href: "/forms/maintenance/chemical-control",
      gradient: "from-purple-900 via-purple-800 to-fuchsia-900",
      accent: "bg-purple-400"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-10">
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

        <FormsTabs role={role} />

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {forms.map((form, index) => (
            <div key={index} className={`bg-gradient-to-br ${form.gradient} rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-white/10 hover:-translate-y-1 transition-transform`}>
              <div className="relative z-10 mb-8">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-black/20 border border-white/10 text-white/90 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${form.accent} mr-2 animate-pulse`}></span>
                  Maintenance Form
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2">{form.title}</h2>
                <p className="text-white/70 text-sm font-medium">
                  {form.description}
                </p>
              </div>
              <Link href={form.href} className="group flex items-center justify-center w-full bg-white text-gray-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition-colors shadow-lg uppercase tracking-wider">
                {form.icon} Open Form
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
