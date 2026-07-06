"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateAsset, deleteAsset } from "@/app/actions/asset"
import { Edit2, Trash2, ArrowLeft, Save, X, History, Wrench, Package } from "lucide-react"
import { QRCodeDisplay } from "./QRCodeDisplay"
import Link from "next/link"
import { format } from "date-fns"

export function AssetDetailClient({ asset, departments, locations }: { asset: any, departments: any[], locations: any[] }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "logs">("details")
  const [formData, setFormData] = useState(asset)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateAsset(asset.id, formData)
    if (result.success) {
      alert("Asset updated successfully!")
      setIsEditing(false)
      router.refresh()
    } else {
      alert(result.error)
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this asset? This cannot be undone.")) return
    
    setIsDeleting(true)
    const result = await deleteAsset(asset.id)
    if (result.success) {
      alert("Asset deleted")
      router.push("/dashboard/assets/list")
    } else {
      alert(result.error)
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/assets/list" className="text-slate-500 hover:text-slate-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{asset.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm ml-8">
            <span className="font-mono bg-slate-200 px-2 py-1 rounded text-slate-700 font-bold">{asset.assetTag}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              asset.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
              asset.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
              asset.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {asset.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition shadow-sm">
                <Edit2 className="w-4 h-4 mr-2" /> Edit Asset
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex items-center px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 font-bold hover:bg-red-50 transition shadow-sm disabled:opacity-50">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setIsEditing(false); setFormData(asset); }} className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition shadow-sm">
                <X className="w-4 h-4 mr-2" /> Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex items-center px-6 py-2 bg-teal-600 border border-teal-700 rounded-lg text-white font-bold hover:bg-teal-700 transition shadow-sm disabled:opacity-50">
                <Save className="w-4 h-4 mr-2" /> Save Changes
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center"><Package className="w-4 h-4 mr-2 text-teal-600" /> General Specifications</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Name</label>
                  {isEditing ? (
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" />
                  ) : (
                    <p className="font-bold text-slate-900">{asset.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Type</label>
                  {isEditing ? (
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none">
                      <option value="IT_EQUIPMENT">IT Equipment</option>
                      <option value="VEHICLE">Vehicle</option>
                      <option value="MACHINERY">Machinery</option>
                      <option value="FURNITURE">Furniture</option>
                      <option value="SAFETY">Safety Equipment</option>
                      <option value="OTHER">Other</option>
                    </select>
                  ) : (
                    <p className="font-medium text-slate-900">{asset.type.replace('_', ' ')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brand</label>
                  {isEditing ? (
                    <input type="text" value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none" />
                  ) : (
                    <p className="font-medium text-slate-900">{asset.brand || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Model</label>
                  {isEditing ? (
                    <input type="text" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none" />
                  ) : (
                    <p className="font-medium text-slate-900">{asset.model || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Serial Number</label>
                  {isEditing ? (
                    <input type="text" value={formData.serialNumber || ''} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none font-mono" />
                  ) : (
                    <p className="font-mono text-slate-900">{asset.serialNumber || '-'}</p>
                  )}
                </div>

                {formData.type === 'VEHICLE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Plate Number</label>
                    {isEditing ? (
                      <input type="text" value={formData.plateNumber || ''} onChange={e => setFormData({...formData, plateNumber: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none uppercase font-bold" />
                    ) : (
                      <p className="font-bold text-slate-900">{asset.plateNumber || '-'}</p>
                    )}
                  </div>
                )}
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Notes</label>
                  {isEditing ? (
                    <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none"></textarea>
                  ) : (
                    <p className="text-slate-700 whitespace-pre-wrap">{asset.description || 'No description provided.'}</p>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center">Status & Location</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  {isEditing ? (
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none font-bold">
                      <option value="AVAILABLE">Available</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="MAINTENANCE">In Maintenance</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  ) : (
                    <p className="font-bold text-slate-900">{asset.status}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department Owner</label>
                  {isEditing ? (
                    <select value={formData.departmentId || ''} onChange={e => setFormData({...formData, departmentId: e.target.value || null})} className="w-full p-2 border rounded focus:border-teal-500 outline-none">
                      <option value="">-- No Department --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  ) : (
                    <p className="font-medium text-slate-900">{asset.department?.name || 'Unassigned'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Physical Location</label>
                  {isEditing ? (
                    <select value={formData.locationId || ''} onChange={e => setFormData({...formData, locationId: e.target.value || null})} className="w-full p-2 border rounded focus:border-teal-500 outline-none">
                      <option value="">-- No Location --</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  ) : (
                    <p className="font-medium text-slate-900">{asset.location?.name || 'Unknown'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center">Financials</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purchase Date</label>
                  {isEditing ? (
                    <input type="date" value={formData.purchaseDate ? format(new Date(formData.purchaseDate), 'yyyy-MM-dd') : ''} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none" />
                  ) : (
                    <p className="font-medium text-slate-900">{asset.purchaseDate ? format(new Date(asset.purchaseDate), 'dd MMM yyyy') : '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purchase Value</label>
                  {isEditing ? (
                    <input type="number" step="0.01" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-2 border rounded focus:border-teal-500 outline-none" />
                  ) : (
                    <p className="font-bold text-teal-700">{asset.price ? `RM ${parseFloat(asset.price).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code Sticker */}
            <QRCodeDisplay assetId={asset.id} assetTag={asset.assetTag} />
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Asset History</h3>
            <button className="text-sm font-bold text-teal-600 hover:text-teal-800">
              + Add Log Entry
            </button>
          </div>
          
          {asset.maintenance.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No history or maintenance logs recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {asset.maintenance.map((log: any) => (
                <div key={log.id} className="flex gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                  <div className="flex-shrink-0 mt-1">
                    {log.type === 'MAINTENANCE' ? (
                      <Wrench className="w-6 h-6 text-amber-500" />
                    ) : (
                      <History className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.type === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {log.type}
                      </span>
                      <span className="text-sm text-slate-500 font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{log.description}</p>
                    {log.cost > 0 && <p className="text-sm font-bold text-red-600 mt-1">Cost: RM {parseFloat(log.cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>}
                    <p className="text-xs text-slate-500 mt-1">Logged by: {log.performedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
