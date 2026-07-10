"use client"

import { useState } from "react"
import { ProfileForm, GlobalSettingsForm, BackupRestorePanel, NoticeManager } from "./SettingsClient"
import { User, Settings, Database, Megaphone } from "lucide-react"
import { motion } from "framer-motion"

type Tab = {
  id: string
  name: string
  description: string
  icon: any
  adminOnly?: boolean
  superAdminOnly?: boolean
}

export function SettingsLayoutClient({
  user,
  settingsMap,
  notices,
  units,
  isSuperAdmin,
  isTrueSuperAdmin
}: {
  user: any
  settingsMap: Record<string, string>
  notices: any[]
  units: any[]
  isSuperAdmin: boolean
  isTrueSuperAdmin: boolean
}) {
  const [activeTab, setActiveTab] = useState("PROFILE")

  const tabs: Tab[] = [
    {
      id: "PROFILE",
      name: "My Profile",
      description: "Personal profile details and security",
      icon: User
    },
    ...(isSuperAdmin && isTrueSuperAdmin ? [
      {
        id: "NOTICES",
        name: "Billboard Notices",
        description: "Publish system-wide announcement banners",
        icon: Megaphone,
        adminOnly: true
      },
      {
        id: "CONFIG",
        name: "Global Configuration",
        description: "Company information and support parameters",
        icon: Settings,
        adminOnly: true
      }
    ] : []),
    ...(isSuperAdmin ? [
      {
        id: "BACKUP",
        name: "Backup & Restore",
        description: "Export data, download SQL dumps or restore",
        icon: Database,
        adminOnly: true
      }
    ] : [])
  ]

  const activeTabDetails = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* ── Left Sidebar Navigation ── */}
      <div className="lg:col-span-1">
        <nav className="flex flex-col space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left transition-all outline-none select-none z-10 ${
                  isActive 
                    ? "text-zinc-950 font-bold" 
                    : "text-zinc-500 hover:text-zinc-800 font-semibold"
                }`}
              >
                {/* Smooth Sliding Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="activeSettingsTab"
                    className="absolute inset-0 bg-zinc-100 rounded-xl -z-10 border border-zinc-200/20"
                    transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  />
                )}
                
                <Icon className={`h-5 w-5 ${isActive ? "text-zinc-950" : "text-zinc-400 group-hover:text-zinc-500"}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] tracking-tight leading-tight">{tab.name}</span>
                  {tab.adminOnly && (
                    <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Admin</span>
                  )}
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Active Pane ── */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
              <activeTabDetails.icon className="h-5.5 w-5.5 text-zinc-800" />
              {activeTabDetails.name}
            </h2>
            <p className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wider">{activeTabDetails.description}</p>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            {activeTab === "PROFILE" && <ProfileForm user={user} />}
            {activeTab === "NOTICES" && <NoticeManager notices={notices} units={units} />}
            {activeTab === "CONFIG" && <GlobalSettingsForm settingsMap={settingsMap} />}
            {activeTab === "BACKUP" && <BackupRestorePanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
