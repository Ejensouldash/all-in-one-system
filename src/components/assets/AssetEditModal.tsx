"use client"

import { useState, useEffect } from "react"
import { X, Save, QrCode, Smartphone, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { updateAsset } from "@/app/actions/asset"

export function AssetEditModal({ asset, units, onClose }: { asset: any, units: any[], onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'EDIT' | 'QR'>('EDIT')
  const [isSaving, setIsSaving] = useState(false)
  const [qrUrl, setQrUrl] = useState("")

  useEffect(() => {
    // Generate full URL based on the current environment dynamically
    setQrUrl(`${window.location.origin}/assets/${asset.id}/qr`)
  }, [asset.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.append("id", asset.id)
      await updateAsset(formData)
      onClose()
    } catch (err: any) {
      alert(`Error updating asset: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('EDIT')} 
              className={`font-bold text-sm pb-1 border-b-2 transition-colors ${activeTab === 'EDIT' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Edit Asset
            </button>
            <button 
              onClick={() => setActiveTab('QR')} 
              className={`font-bold text-sm pb-1 border-b-2 transition-colors flex items-center ${activeTab === 'QR' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <QrCode className="h-4 w-4 mr-1" /> View QR
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white shadow-sm p-1.5 rounded-full border border-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'EDIT' ? (
            <form id="editAssetForm" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Brand</label>
                  <input type="text" name="brand" defaultValue={asset.brand} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Model</label>
                  <input type="text" name="model" defaultValue={asset.model} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Serial Number</label>
                  <input type="text" name="serialNumber" defaultValue={asset.serialNumber || ""} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Barcode</label>
                  <input type="text" name="barcode" defaultValue={asset.barcode || ""} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Category</label>
                  <input type="text" name="category" defaultValue={asset.category} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status</label>
                  <select name="status" defaultValue={asset.status} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Department / Unit</label>
                <select name="unitId" defaultValue={asset.unitId || ""} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Unassigned --</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assignee Name</label>
                <input type="text" name="assigneeName" defaultValue={asset.assigneeName || ""} placeholder="e.g. John Doe" className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl border border-indigo-100 flex items-start text-left">
                <Smartphone className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">Scan this QR code with a mobile phone to instantly view a beautifully formatted, digital asset report. The URL adapts to your current environment.</p>
              </div>
              
              <div className="p-4 bg-white border-2 border-gray-100 shadow-md rounded-2xl relative group">
                <QRCodeSVG 
                  value={qrUrl} 
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="rounded-xl"
                />
                <button 
                  onClick={() => window.open(qrUrl, '_blank')}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-sm"
                >
                  <Printer className="mr-2 h-5 w-5" /> Open Web Report
                </button>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-lg">{asset.brand} {asset.model}</h3>
                <p className="text-gray-500 text-sm">{asset.category} • {asset.serialNumber || asset.barcode || "No SN"}</p>
                <p className="text-xs font-mono text-gray-400 mt-2 truncate w-64 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 mx-auto" title={qrUrl}>
                  {qrUrl}
                </p>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'EDIT' && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md font-semibold text-sm text-gray-600 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button disabled={isSaving} type="submit" form="editAssetForm" className="px-4 py-2 rounded-md font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors flex items-center disabled:opacity-50">
              <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
