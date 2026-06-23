"use client"

import { useState } from "react"
import { updateProfile, updateGlobalSettings, generateBackup, restoreBackup } from "@/app/actions/settings"
import { createNotice, toggleNotice, deleteNotice } from "@/app/actions/notice"
import { Save, Download, Upload, AlertTriangle, CheckCircle2, Megaphone, Trash2, Power } from "lucide-react"

export function ProfileForm({ user }: { user: any }) {
  const [status, setStatus] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("Saving...")
    const res = await updateProfile(new FormData(e.currentTarget))
    setStatus(res.success ? "Profile updated successfully!" : `Error: ${res.error}`)
    setTimeout(() => setStatus(""), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input type="text" name="name" defaultValue={user.name} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Cannot be changed)</label>
        <input type="email" value={user.email} disabled className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-md" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
        <input type="password" name="password" placeholder="Enter new password" className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center">
        <Save className="h-4 w-4 mr-2" /> Save Profile
      </button>
      {status && <p className={`text-sm ${status.includes("Error") ? "text-red-500" : "text-green-600"} font-medium mt-2`}>{status}</p>}
    </form>
  )
}

export function GlobalSettingsForm({ settingsMap }: { settingsMap: Record<string, string> }) {
  const [status, setStatus] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("Saving...")
    const res = await updateGlobalSettings(new FormData(e.currentTarget))
    setStatus(res.success ? "Settings updated successfully!" : `Error: ${res.error}`)
    setTimeout(() => setStatus(""), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
        <input type="text" name="COMPANY_NAME" defaultValue={settingsMap["COMPANY_NAME"] || ""} placeholder="e.g. Acme Corp" className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
        <input type="email" name="SUPPORT_EMAIL" defaultValue={settingsMap["SUPPORT_EMAIL"] || ""} placeholder="e.g. it@acme.com" className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center">
        <Save className="h-4 w-4 mr-2" /> Save Configuration
      </button>
      {status && <p className={`text-sm ${status.includes("Error") ? "text-red-500" : "text-green-600"} font-medium mt-2`}>{status}</p>}
    </form>
  )
}

export function BackupRestorePanel() {
  const [isRestoring, setIsRestoring] = useState(false)
  const [status, setStatus] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const handleBackup = async () => {
    setStatus("Generating backup...")
    const res = await generateBackup()
    if (res.success && res.data) {
      const blob = new Blob([res.data], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `itsm_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus("Backup downloaded successfully!")
    } else {
      setStatus(`Backup Failed: ${res.error}`)
    }
    setTimeout(() => setStatus(""), 5000)
  }

  const handleRestore = async () => {
    if (!file) return alert("Please select a JSON backup file first.")
    
    const confirmation = prompt("WARNING: This will completely WIPE the current database and replace it with the uploaded backup. This action is irreversible.\n\nType 'RESTORE' to confirm:")
    if (confirmation !== "RESTORE") {
      setStatus("Restore cancelled.")
      return
    }

    setIsRestoring(true)
    setStatus("Reading file...")
    
    try {
      const text = await file.text()
      setStatus("Restoring database... Please wait.")
      const res = await restoreBackup(text)
      
      if (res.success) {
        setStatus("Database restored successfully! Refreshing page...")
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setStatus(`Restore Failed: ${res.error}`)
      }
    } catch (e: any) {
      setStatus(`Error reading file: ${e.message}`)
    }
    setIsRestoring(false)
  }

  return (
    <div className="space-y-8">
      {/* Backup Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <div className="flex items-start">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-4">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Generate System Backup</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Download a complete snapshot of all database records including users, assets, tickets, and configurations as a JSON file.</p>
            <button onClick={handleBackup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center shadow-sm">
              <Download className="h-4 w-4 mr-2" /> Download Backup
            </button>
          </div>
        </div>
      </div>

      {/* Restore Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-5">
        <div className="flex items-start">
          <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
            <Upload className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Restore from Backup</h3>
            <p className="text-sm text-red-700 mt-1 mb-4 font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1.5" /> Warning: Restoring will overwrite all current live data.
            </p>
            <div className="flex items-center space-x-3">
              <input 
                type="file" 
                accept="application/json" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-white file:text-red-700 hover:file:bg-gray-50 file:border file:border-red-200 file:cursor-pointer"
              />
              <button 
                onClick={handleRestore} 
                disabled={!file || isRestoring}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center shadow-sm"
              >
                {isRestoring ? "Restoring..." : "Upload & Restore"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg font-medium flex items-center ${status.includes("Failed") || status.includes("Error") ? "bg-red-100 text-red-800" : "bg-blue-50 text-blue-800"}`}>
          {status.includes("success") ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertTriangle className="h-5 w-5 mr-2" />}
          {status}
        </div>
      )}
    </div>
  )
}

export function NoticeManager({ notices, units }: { notices: any[], units: any[] }) {
  const [status, setStatus] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("Publishing notice...")
    try {
      await createNotice(new FormData(e.currentTarget))
      setStatus("Notice published successfully!")
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setStatus(`Error: ${err.message}`)
    }
    setTimeout(() => setStatus(""), 3000)
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleNotice(id, !current)
    } catch(err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notice?")) return
    try {
      await deleteNotice(id)
    } catch(err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
        <h4 className="font-semibold text-gray-800 text-sm flex items-center mb-2">
          <Megaphone className="h-4 w-4 mr-2 text-blue-500" /> Create New Billboard Notice
        </h4>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Message</label>
          <input type="text" name="message" required placeholder="Type the announcement here..." className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type / Color</label>
            <select name="type" className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500">
              <option value="NORMAL">Normal (Green)</option>
              <option value="AWARE">Aware (Yellow)</option>
              <option value="URGENT">Urgent (Red + Pulse)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Target Audience</label>
            <select name="targetAudience" className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ALL">All Departments (Global)</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors w-full shadow-sm">
          Publish Notice
        </button>
        {status && <p className={`text-sm ${status.includes("Error") ? "text-red-500" : "text-emerald-600"} font-bold mt-2 text-center`}>{status}</p>}
      </form>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">Active & Past Notices</h4>
        {notices.length === 0 ? <p className="text-sm text-gray-500">No notices found.</p> : notices.map(notice => (
          <div key={notice.id} className={`flex items-center justify-between p-4 rounded-lg border ${notice.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  notice.type === 'URGENT' ? 'bg-red-100 text-red-700' : 
                  notice.type === 'AWARE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {notice.type}
                </span>
                <span className="text-xs text-gray-500 font-medium border border-gray-200 px-2 rounded-full">
                  Target: {notice.targetAudience === 'ALL' ? 'Global' : units.find(u => u.id === notice.targetAudience)?.name || 'Unknown'}
                </span>
              </div>
              <p className="text-sm text-gray-800 font-medium">{notice.message}</p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button 
                onClick={() => handleToggle(notice.id, notice.isActive)}
                className={`p-2 rounded-md flex items-center shadow-sm text-xs font-bold transition-colors ${notice.isActive ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                title="Toggle Active Status"
              >
                <Power className="h-3 w-3 mr-1" /> {notice.isActive ? "Deactivate" : "Activate"}
              </button>
              <button 
                onClick={() => handleDelete(notice.id)}
                className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                title="Delete Notice"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
