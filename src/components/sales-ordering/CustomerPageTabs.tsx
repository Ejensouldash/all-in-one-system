"use client"

import { useState } from "react"
import { Users, FileCheck2, Clock } from "lucide-react"
import { CustomerRegistrationSection } from "./CustomerRegistrationSection"

export function CustomerPageTabs({
  customersContent,
  registrations,
}: {
  customersContent: React.ReactNode
  registrations: any[]
}) {
  const [tab, setTab] = useState<"CUSTOMERS" | "REGISTRATIONS">("CUSTOMERS")
  const pendingCount = registrations.filter(r => r.status === "PENDING").length

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab("CUSTOMERS")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            tab === "CUSTOMERS"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users className="h-4 w-4" /> Customer Master List
        </button>

        <button
          onClick={() => setTab("REGISTRATIONS")}
          className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
            tab === "REGISTRATIONS"
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileCheck2 className="h-4 w-4" /> Pending Registrations (Google Form)
          {pendingCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-slate-950 animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {tab === "CUSTOMERS" ? (
        customersContent
      ) : (
        <CustomerRegistrationSection
          registrations={registrations}
          onRefresh={() => window.location.reload()}
        />
      )}
    </div>
  )
}
