"use client"

import { useState } from "react"
import { createForm, deleteForm, updateForm } from "@/app/actions/form"
import { FileText, Plus, AlertCircle, X, Trash2, ExternalLink, Edit3 } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddFormModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inputType, setInputType] = useState("FILE") // FILE or LINK

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append("inputType", inputType)
    
    const res = await createForm(formData)
    
    setIsSubmitting(false)
    if (!res.success) setError(res.error || "Failed to create form")
    else {
      onClose()
      router.refresh()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-indigo-500" /> Add New Form / Document
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center border border-red-100"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Document Title *</label>
            <input type="text" name="title" required placeholder="e.g., Annual Leave Request Form" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
              <select name="category" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="HR">HR</option>
                <option value="IT">IT</option>
                <option value="Finance">Finance</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Access Level</label>
              <select name="accessLevel" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="STAFF">All Staff (Public)</option>
                <option value="SUPERADMIN">SuperAdmins (Private)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
            <textarea name="description" rows={2} placeholder="Brief details about this document..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
          </div>

          <div className="border border-gray-200 rounded-lg p-1 flex bg-gray-50 mb-2">
            <button type="button" onClick={() => setInputType("FILE")} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${inputType === "FILE" ? "bg-white shadow-sm text-indigo-600 border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>Upload File</button>
            <button type="button" onClick={() => setInputType("LINK")} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${inputType === "LINK" ? "bg-white shadow-sm text-indigo-600 border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>External Link</button>
          </div>

          {inputType === "FILE" ? (
            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 border-dashed">
              <label className="block text-sm font-bold text-indigo-900 mb-2">Select File (PDF, DOCX, etc) *</label>
              <input type="file" name="file" required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200" />
            </div>
          ) : (
            <div className="space-y-4 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
              <div>
                <label className="block text-sm font-bold text-indigo-900 mb-1">URL / Link *</label>
                <input type="url" name="linkUrl" required placeholder="https://docs.google.com/..." className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-indigo-900 mb-1">Link Display Text</label>
                <input type="text" name="linkText" placeholder="e.g. Fill Google Form" className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center">
              {isSubmitting ? "Saving..." : <><Plus className="h-4 w-4 mr-2" /> Add Document</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function DeleteFormButton({ id }: { id: string }) {
  const router = useRouter()
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this form?")) return
    const res = await deleteForm(id)
    if (!res.success) alert(res.error)
    else router.refresh()
  }
  return (
    <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors" title="Delete Form">
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

export function FormsDashboardClient({ role, children }: { role: string, children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Forms & Documents</h1>
          <p className="text-gray-500 mt-1">Centralized library for all official company documents and requests.</p>
        </div>
        {role === "SUPERADMIN" && (
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
            <Plus className="h-4 w-4 mr-2" /> Add New Form
          </button>
        )}
      </div>

      <AddFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {children}
    </div>
  )
}

export function EditFormButton({ form }: { form: any }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }} 
        className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-md transition-colors mr-2" 
        title="Edit Form"
      >
        <Edit3 className="h-4 w-4" />
      </button>
      {isOpen && <EditFormModal form={form} onClose={() => setIsOpen(false)} />}
    </>
  )
}

export function EditFormModal({ form, onClose }: { form: any | null, onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append("id", form.id)
    
    const res = await updateForm(formData)
    
    setIsSubmitting(false)
    if (!res.success) setError(res.error || "Failed to update form")
    else {
      onClose()
      router.refresh()
    }
  }

  if (!form) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Edit3 className="h-5 w-5 mr-2 text-indigo-500" /> Edit Form
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center border border-red-100"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Document Title *</label>
            <input type="text" name="title" defaultValue={form.title} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
              <select name="category" defaultValue={form.category || "General"} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="HR">HR</option>
                <option value="IT">IT</option>
                <option value="Finance">Finance</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Access Level</label>
              <select name="accessLevel" defaultValue={form.accessLevel} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="STAFF">All Staff (Public)</option>
                <option value="SUPERADMIN">SuperAdmins (Private)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
            <textarea name="description" defaultValue={form.description || ""} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
          </div>

          {!form.fileUrl && (
            <div className="space-y-4 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
              <div>
                <label className="block text-sm font-bold text-indigo-900 mb-1">URL / Link</label>
                <input type="url" name="linkUrl" defaultValue={form.linkUrl || form.linkOrContent} required className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-indigo-900 mb-1">Link Display Text</label>
                <input type="text" name="linkText" defaultValue={form.linkText || ""} className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center">
              {isSubmitting ? "Updating..." : "Update Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
