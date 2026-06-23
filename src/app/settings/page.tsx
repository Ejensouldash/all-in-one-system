import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProfileForm, GlobalSettingsForm, BackupRestorePanel, NoticeManager } from "./SettingsClient"
import { User, Settings, Database, ShieldAlert, Megaphone } from "lucide-react"

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
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile preferences and system configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center">
            <User className="h-5 w-5 text-indigo-500 mr-2" />
            <h3 className="font-semibold text-gray-800">My Profile</h3>
          </div>
          <div className="p-6">
            <ProfileForm user={user} />
          </div>
        </div>

        {isSuperAdmin && (
          <div className="space-y-8">
            
            {isTrueSuperAdmin && (
              <>
                {/* Billboard Notices */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center">
                      <Megaphone className="h-5 w-5 text-amber-500 mr-2" />
                      <h3 className="font-semibold text-gray-800">Billboard Notices</h3>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">Admin Only</span>
                  </div>
                  <div className="p-6">
                    <NoticeManager notices={notices} units={units} />
                  </div>
                </div>

                {/* Global Configurations Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 text-emerald-500 mr-2" />
                      <h3 className="font-semibold text-gray-800">Global Configuration</h3>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">Admin Only</span>
                  </div>
                  <div className="p-6">
                    <GlobalSettingsForm settingsMap={settingsMap} />
                  </div>
                </div>
              </>
            )}

            {/* Backup & Restore Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="font-semibold text-gray-800">Data Backup & Restore</h3>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">Admin Only</span>
              </div>
              <div className="p-6">
                <BackupRestorePanel />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
