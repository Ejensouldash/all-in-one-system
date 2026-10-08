"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateAsset, deleteAsset, uploadAssetPhotoAction } from "@/app/actions/asset"
import { 
  Edit2, 
  Trash2, 
  ArrowLeft, 
  Save, 
  X, 
  History, 
  Wrench, 
  Package, 
  Camera, 
  Upload, 
  Image as ImageIcon,
  Building2,
  MapPin,
  Tag,
  Loader2
} from "lucide-react"
import { QRCodeDisplay } from "./QRCodeDisplay"
import { CameraCaptureModal } from "@/components/forms/CameraCaptureModal"
import Link from "next/link"
import { format } from "date-fns"

export function AssetDetailClient({ asset, departments, locations }: { asset: any, departments: any[], locations: any[] }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "logs">("details")
  const [formData, setFormData] = useState(asset)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Camera & Photo State
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(asset.imageUrl || null)

  const handleCapturePhoto = (file: File, previewUrl: string) => {
    setNewPhotoFile(file)
    setPhotoPreview(previewUrl)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNewPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRemovePhoto = () => {
    if (newPhotoFile && photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setNewPhotoFile(null)
    setPhotoPreview(null)
    setFormData((prev: any) => ({ ...prev, imageUrl: null }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      let finalImageUrl = formData.imageUrl

      if (newPhotoFile) {
        const uploadData = new FormData()
        uploadData.append("photo", newPhotoFile)
        const uploadRes = await uploadAssetPhotoAction(uploadData)
        if (uploadRes.success && uploadRes.url) {
          finalImageUrl = uploadRes.url
        }
      }

      const payload = {
        name: formData.name?.trim(),
        brand: formData.brand?.trim() || null,
        serialNumber: formData.serialNumber?.trim() || null,
        condition: formData.condition || "Good",
        departmentId: formData.departmentId || null,
        locationId: formData.locationId || null,
        imageUrl: finalImageUrl,
      }

      const result = await updateAsset(asset.id, payload)
      if (result.success) {
        alert("Asset details updated successfully!")
        setIsEditing(false)
        router.refresh()
      } else {
        alert(result.error || "Failed to update asset.")
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while updating asset.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this asset? This action cannot be undone.")) return
    
    setIsDeleting(true)
    const result = await deleteAsset(asset.id)
    if (result.success) {
      alert("Asset deleted successfully.")
      router.push("/dashboard/assets/list")
    } else {
      alert(result.error || "Failed to delete asset.")
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/dashboard/assets/list" 
              className="text-slate-500 hover:text-slate-900 transition p-1.5 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{asset.name}</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-sm ml-9">
            {/* Condition Badge */}
            {asset.condition === 'Good' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Condition: Good
              </span>
            )}
            {asset.condition === 'Usable' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Condition: Usable
              </span>
            )}
            {asset.condition === 'Bad' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Condition: Bad
              </span>
            )}
            {asset.condition === 'Unused' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                Condition: Unused
              </span>
            )}
            {!asset.condition && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                No Condition Set
              </span>
            )}

            {/* Department Badge */}
            {asset.department?.name && (
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                {asset.department.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button 
                onClick={() => {
                  setFormData(asset)
                  setPhotoPreview(asset.imageUrl || null)
                  setNewPhotoFile(null)
                  setIsEditing(true)
                }} 
                className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition shadow-2xs text-xs"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Asset
              </button>
              <button 
                onClick={handleDelete} 
                disabled={isDeleting} 
                className="flex items-center px-4 py-2 bg-white border border-red-200 rounded-xl text-red-600 font-bold hover:bg-red-50 transition shadow-2xs text-xs disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />} 
                Delete
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { 
                  setIsEditing(false)
                  setFormData(asset)
                  setPhotoPreview(asset.imageUrl || null)
                  setNewPhotoFile(null)
                }} 
                className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition shadow-2xs text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="flex items-center px-5 py-2 bg-teal-600 border border-teal-700 rounded-xl text-white font-bold hover:bg-teal-700 transition shadow-2xs text-xs disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} 
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab("details")}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'details' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Asset Information
          </button>
          <button 
            onClick={() => setActiveTab("logs")}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'logs' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Activity & Maintenance Logs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center">
                  <Package className="w-4 h-4 mr-2 text-teal-600" /> Specifications & Registry
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* Photo Preview & Edit */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Asset Photo
                  </label>
                  
                  {photoPreview ? (
                    <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <img 
                        src={photoPreview} 
                        alt="Asset photo" 
                        className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-2xs" 
                      />
                      {isEditing && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-700">Photo attached</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCameraOpen(true)}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
                            >
                              Retake with Camera
                            </button>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="p-4 border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 rounded-xl flex items-center justify-center gap-2 text-teal-800 font-bold text-xs transition"
                      >
                        <Camera className="w-4 h-4 text-teal-600" />
                        Take Photo (Camera)
                      </button>
                      <label className="p-4 border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-bold text-xs transition cursor-pointer">
                        <Upload className="w-4 h-4 text-slate-500" />
                        Upload from Device
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                      </label>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                      <ImageIcon className="w-4 h-4 text-slate-300" />
                      No photo uploaded for this asset.
                    </div>
                  )}
                </div>

                {/* Form Fields matching Excel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  
                  {/* Item (Name) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Item (Asset Name)</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        className="w-full p-2.5 border rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm font-semibold" 
                      />
                    ) : (
                      <p className="font-bold text-slate-900 text-sm">{asset.name}</p>
                    )}
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brand</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.brand || ''} 
                        onChange={e => setFormData({ ...formData, brand: e.target.value })} 
                        className="w-full p-2.5 border rounded-lg focus:border-teal-500 outline-none text-sm font-medium" 
                      />
                    ) : (
                      <p className="font-medium text-slate-800 text-sm">{asset.brand || '—'}</p>
                    )}
                  </div>

                  {/* Barcode / Serial Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Barcode / Serial Number</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.serialNumber || ''} 
                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} 
                        className="w-full p-2.5 border rounded-lg focus:border-teal-500 outline-none font-mono text-sm" 
                      />
                    ) : (
                      <p className="font-mono font-bold text-slate-900 text-sm">{asset.serialNumber || '—'}</p>
                    )}
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Condition</label>
                    {isEditing ? (
                      <select 
                        value={formData.condition || 'Good'} 
                        onChange={e => setFormData({ ...formData, condition: e.target.value })} 
                        className="w-full p-2.5 border rounded-lg focus:border-teal-500 outline-none bg-white font-bold text-sm"
                      >
                        <option value="Good">Good</option>
                        <option value="Usable">Usable</option>
                        <option value="Bad">Bad</option>
                        <option value="Unused">Unused</option>
                      </select>
                    ) : (
                      <p className="font-bold text-slate-800 text-sm">{asset.condition || '—'}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                    {isEditing ? (
                      <select 
                        value={formData.departmentId || ''} 
                        onChange={e => setFormData({ ...formData, departmentId: e.target.value || null })} 
                        className="w-full p-2.5 border rounded-lg focus:border-teal-500 outline-none bg-white text-sm"
                      >
                        <option value="">-- No Department --</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    ) : (
                      <p className="font-medium text-slate-900 text-sm">{asset.department?.name || 'Unassigned'}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                    {isEditing ? (
                      <select 
                        value={formData.locationId || ''} 
                        onChange={e => setFormData({ ...formData, locationId: e.target.value || null })} 
                        className="w-full p-2.5 border rounded-lg focus:border-teal-500 outline-none bg-white text-sm"
                      >
                        <option value="">-- No Location --</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    ) : (
                      <p className="font-medium text-slate-900 text-sm">{asset.location?.name || 'Unassigned'}</p>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* QR Code Sticker Box */}
            <QRCodeDisplay assetId={asset.id} assetTag={asset.assetTag} departmentCode={asset.department?.code} />

            {/* Quick Metadata Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Reference</h4>
              <div className="text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Internal ID:</span>
                  <span className="font-mono font-bold text-slate-700">{asset.assetTag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registered:</span>
                  <span>{format(new Date(asset.createdAt), "dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated:</span>
                  <span>{format(new Date(asset.updatedAt), "dd MMM yyyy")}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab: Maintenance Logs */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Asset Maintenance History</h3>
          </div>
          
          {asset.maintenance.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">No maintenance records logged for this asset yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {asset.maintenance.map((log: any) => (
                <div key={log.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="flex-shrink-0 mt-1">
                    <Wrench className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-slate-500 font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                    </div>
                    <p className="text-slate-800 font-medium text-sm">{log.description}</p>
                    {log.cost > 0 && <p className="text-xs font-bold text-red-600 mt-1">Cost: RM {parseFloat(log.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturePhoto}
        title="Capture Asset Photo"
      />
    </div>
  )
}
