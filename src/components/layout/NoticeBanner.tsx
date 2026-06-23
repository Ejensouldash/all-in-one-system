"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle, Info, Bell } from "lucide-react"

export function NoticeBanner({ notices }: { notices: any[] }) {
  const [visibleNotices, setVisibleNotices] = useState<any[]>([])

  useEffect(() => {
    // Check localStorage for dismissed notices
    const dismissed = JSON.parse(localStorage.getItem("dismissedNotices") || "[]")
    
    // Filter out dismissed notices
    const active = notices.filter(n => !dismissed.includes(n.id))
    setVisibleNotices(active)
  }, [notices])

  const handleDismiss = (id: string) => {
    const dismissed = JSON.parse(localStorage.getItem("dismissedNotices") || "[]")
    dismissed.push(id)
    localStorage.setItem("dismissedNotices", JSON.stringify(dismissed))
    
    setVisibleNotices(prev => prev.filter(n => n.id !== id))
  }

  if (visibleNotices.length === 0) return null

  return (
    <div className="w-full flex flex-col pointer-events-auto">
      {visibleNotices.map((notice) => {
        let bgColor = "bg-emerald-500"
        let textColor = "text-emerald-50"
        let icon = <Info className="h-5 w-5 text-emerald-100" />
        let animationClass = "animate-in slide-in-from-top-4 duration-500"

        if (notice.type === "AWARE") {
          bgColor = "bg-amber-500"
          textColor = "text-amber-950"
          icon = <Bell className="h-5 w-5 text-amber-900" />
        } else if (notice.type === "URGENT") {
          bgColor = "bg-red-600"
          textColor = "text-white"
          icon = <AlertTriangle className="h-5 w-5 text-red-100" />
          // Soft, elegant pulse for Urgent
          animationClass = "animate-in slide-in-from-top-4 duration-500 animate-[pulse_3s_ease-in-out_infinite]"
        }

        return (
          <div key={notice.id} className={`relative w-full ${bgColor} ${textColor} px-4 py-3 shadow-md border-b border-black/10 ${animationClass}`}>
            <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-full bg-white/20 shadow-inner">
                  {icon}
                </div>
                <div>
                  {notice.type === "URGENT" && <span className="font-bold text-xs uppercase tracking-widest opacity-80 block mb-0.5">Urgent Notice</span>}
                  <p className="text-sm font-semibold tracking-wide drop-shadow-sm">{notice.message}</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleDismiss(notice.id)}
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                title="Dismiss Notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
