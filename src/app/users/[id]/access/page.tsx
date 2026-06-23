import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AccessForm } from "./AccessForm"
import { ShieldCheck, ArrowLeft } from "lucide-react"
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
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto mt-8">
      <Link href="/users" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-black transition-colors bg-white px-3 py-1.5 border-2 border-transparent hover:border-black shadow-sm">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
      </Link>

      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center mb-6 border-b-4 border-black pb-4">
          <div className="bg-emerald-400 p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mr-4">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">Module Access</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Configure access for {user.name}</p>
          </div>
        </div>

        <div className="mb-8 p-4 bg-gray-50 border-2 border-black flex flex-col md:flex-row gap-8">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email</span>
            <p className="font-bold text-lg">{user.email}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Branch</span>
            <p className="font-bold text-lg">{user.branch?.name || "N/A"}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Role</span>
            <p className="font-bold text-lg">{user.role}</p>
          </div>
        </div>

        <AccessForm userId={user.id} initialModules={user.modules || []} />
      </div>
    </div>
  )
}
