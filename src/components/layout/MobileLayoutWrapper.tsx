"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

export function MobileLayoutWrapper({
  role,
  user,
  notices,
  children,
  modals
}: {
  role: string,
  user: any,
  notices: React.ReactNode,
  children: React.ReactNode,
  modals: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load persistence from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed")
      if (saved === "true") {
        setIsCollapsed(true)
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem("sidebar_collapsed", String(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }

  return (
    <div className="flex h-screen print:h-auto print:block overflow-hidden print:overflow-visible bg-gray-50 transition-colors">
      
      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 md:relative md:translate-x-0 print:hidden h-full ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "md:w-20 w-64" : "w-64"}`}>
        <Sidebar 
          role={role} 
          user={user} 
          onMobileClose={() => setIsSidebarOpen(false)} 
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible relative print:block w-full min-w-0">
        <div className="print:hidden z-30">
          <Topbar 
            user={user} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
          {notices}
        </div>
        <main className="flex-1 overflow-y-auto print:overflow-visible p-4 md:p-6 bg-gray-50 text-gray-900 transition-colors print:p-0 print:bg-white w-full">
          {children}
        </main>
        
        {/* Chatbot & Ticket Modal (Global) */}
        <div className="print:hidden">
          {modals}
        </div>
      </div>
    </div>
  )
}
