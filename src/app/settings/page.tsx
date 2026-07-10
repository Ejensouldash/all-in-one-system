import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SettingsLayoutClient } from "./SettingsLayoutClient"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isSuperAdmin = session.user.role === "SUPERADMIN"
  if (!isSuperAdmin) redirect("/dashboard")

  // Fetch current user details
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { unit: true } })
  if (!user) redirect("/login")

  const isTrueSuperAdmin = user.role === "SUPERADMIN"

  // Fetch global settings
  let settingsMap: Record<string, string> = {}
  const settingsList = await prisma.setting.findMany()
  settingsList.forEach(s => { settingsMap[s.key] = s.value })

  // Fetch notices & units
  const notices = isSuperAdmin ? await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } }) : []
  const units = isSuperAdmin ? await prisma.unit.findMany({ orderBy: { name: 'asc' } }) : []

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Manage your profile preferences and system configurations.</p>
      </div>

      <SettingsLayoutClient
        user={user}
        settingsMap={settingsMap}
        notices={notices}
        units={units}
        isSuperAdmin={isSuperAdmin}
        isTrueSuperAdmin={isTrueSuperAdmin}
      />
    </div>
  )
}
