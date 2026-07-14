import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AccessForm } from "./AccessForm"
import { ArrowLeft, ShieldAlert, Mail, Building2, Network } from "lucide-react"
import Link from "next/link"

export default async function EditAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") redirect("/dashboard")

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: { branch: true, unit: true }
  })

  if (!user) {
    redirect("/users")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-500">
      <Link
        href="/users"
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Users
      </Link>

      {/* User profile header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              user.role === "SUPERADMIN"
                ? "bg-purple-100 text-purple-800 border border-purple-200"
                : user.role === "SUPERVISOR"
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-gray-100 text-gray-700 border border-gray-200"
            }`}>
              {user.role === "SUPERADMIN" && <ShieldAlert className="h-3 w-3 mr-1" />}
              {user.role}
            </span>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{user.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configure which system modules this user can access.</p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Email</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
              <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Branch</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{user.branch?.name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
              <Network className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Unit</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{user.unit?.name || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AccessForm userId={user.id} initialModules={user.modules || []} />
    </div>
  )
}
