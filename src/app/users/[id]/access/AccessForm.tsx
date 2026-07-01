"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateUserModules } from "@/app/actions/user"
import { Save, Loader2, CheckSquare, Square } from "lucide-react"

const AVAILABLE_MODULES = [
  { id: "TICKETS", name: "IT Resolution Workspace (Tickets)", description: "Manage and resolve IT issues." },
  { id: "FORMS", name: "Digital Operations (Forms)", description: "Submit and approve daily production reports." },
  { id: "EVENTS", name: "Events & Facilities", description: "Manage company events and calendar." },
  { id: "NOTICES", name: "Internal Notices", description: "Post and read company-wide announcements." },
  { id: "WAREHOUSE", name: "Warehouse & Transfer In", description: "Manage inventory and incoming deliveries." },
  { id: "USERS", name: "User Management", description: "Access to the user directory and organization structure." },
  { id: "SETTINGS", name: "System Settings", description: "Configure system parameters and cost catalogs." },
  { id: "HANDOVER", name: "Production Handover Form", description: "Access to generate and send production handover forms." },
  { id: "USER_LOGS", name: "User Activity Logs", description: "Monitor user actions across the system." },
]

export function AccessForm({ userId, initialModules }: { userId: string, initialModules: string[] }) {
  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleSelectAll = () => {
    if (selectedModules.length === AVAILABLE_MODULES.length) {
      setSelectedModules([])
    } else {
      setSelectedModules(AVAILABLE_MODULES.map(m => m.id))
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    const res = await updateUserModules(userId, selectedModules)
    setIsSubmitting(false)
    if (res.success) {
      alert("Module access updated successfully!")
      router.push("/users")
    } else {
      alert("Failed to update access: " + res.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black uppercase tracking-widest border-b-[3px] border-black pb-1 inline-block">Granted Modules</h2>
        <button 
          onClick={handleSelectAll}
          className="text-sm font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 underline decoration-2 underline-offset-4"
        >
          {selectedModules.length === AVAILABLE_MODULES.length ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_MODULES.map(module => {
          const isSelected = selectedModules.includes(module.id)
          return (
            <div 
              key={module.id}
              onClick={() => toggleModule(module.id)}
              className={`p-4 border-[3px] border-black cursor-pointer transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-start ${isSelected ? 'bg-indigo-50' : 'bg-white'}`}
            >
              <div className="mr-4 mt-1">
                {isSelected ? (
                  <CheckSquare className="w-6 h-6 text-indigo-600" />
                ) : (
                  <Square className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className={`font-black uppercase tracking-wider ${isSelected ? 'text-indigo-900' : 'text-black'}`}>
                  {module.name}
                </h3>
                <p className="text-xs font-bold text-gray-500 mt-1">{module.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-8 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest border-2 border-black hover:bg-gray-800 transition-all shadow-[6px_6px_0px_0px_rgba(100,100,100,1)] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Save Access Config
        </button>
      </div>
    </div>
  )
}
