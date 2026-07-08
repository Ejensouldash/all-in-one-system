"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { createAsset, generateAssetTag } from "@/app/actions/asset"
import { Save, ArrowLeft, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"

export function AssetForm({ departments, locations }: { departments: any[], locations: any[] }) {
  const router = useRouter()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    defaultValues: {
      status: "AVAILABLE",
      type: "ICT_EQUIPMENT"
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const watchType = watch("type")
  const watchDept = watch("departmentId")

  const handleGenerateTag = async () => {
    setIsGenerating(true)
    const res = await generateAssetTag(watchDept || null, watchType || "OTHER")
    if (res.success && res.tag) {
      setValue("assetTag", res.tag, { shouldValidate: true, shouldDirty: true })
    } else {
      alert("Failed to generate tag: " + res.error)
    }
    setIsGenerating(false)
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    const result = await createAsset(data)
    if (result.success) {
      alert("Asset registered successfully!")
      router.push("/dashboard/assets/list")
    } else {
      alert(result.error)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">New Asset Details</h2>
          <p className="text-sm text-slate-500 mt-1">Enter the specifications and metadata for the new physical asset.</p>
        </div>
        <Link href="/dashboard/assets" className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center transition bg-white text-slate-700">
          <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
        </Link>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Asset Tag / QR Code <span className="text-red-500">*</span></label>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="e.g. HRD-ICT-0001"
                {...register("assetTag", { required: true })} 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-bold uppercase"
              />
              <button
                type="button"
                onClick={handleGenerateTag}
                disabled={isGenerating}
                className="flex-shrink-0 px-3 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition flex items-center justify-center font-medium"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Auto
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Select Department and Type before clicking Auto to get the correct prefix.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Asset Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Dell Latitude 7420"
              {...register("name", { required: true })} 
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Asset Type</label>
            <select {...register("type")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white">
              <option value="ICT_EQUIPMENT">ICT Equipment</option>
              <option value="OFFICE_EQUIPMENT">Office Equipment</option>
              <option value="EVENT_EQUIPMENT">Event Equipment (Khemah, etc.)</option>
              <option value="TOOLS">Tools (Drill, Grinder, etc.)</option>
              <option value="SAFETY_EQUIPMENT">Safety Equipment</option>
              <option value="MACHINE">Machine / Compressor</option>
              <option value="ELECTRICAL_EQUIPMENT">Electrical Equipment</option>
              <option value="FURNITURE">Furniture (Desk, Chair)</option>
              <option value="VEHICLE">Vehicle (Lorry, Van, Car)</option>
              <option value="OTHER">Other</option>

            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Current Status</label>
            <select {...register("status")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white">
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="MAINTENANCE">In Maintenance</option>
              <option value="RETIRED">Retired / Disposed</option>
            </select>
          </div>
        </div>

        {/* Placement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Department Owner</label>
            <select {...register("departmentId")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white">
              <option value="">-- No Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Physical Location</label>
            <select {...register("locationId")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white">
              <option value="">-- No Location Set --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Brand</label>
            <input type="text" {...register("brand")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Model</label>
            <input type="text" {...register("model")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Serial Number</label>
            <input type="text" {...register("serialNumber")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 uppercase font-mono text-sm" />
          </div>
        </div>

        {/* Conditional Vehicle Info */}
        {watchType === "VEHICLE" && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in zoom-in duration-300">
            <label className="block text-sm font-bold text-blue-900 mb-2">Plate Number</label>
            <input type="text" {...register("plateNumber")} placeholder="e.g. VCD 1234" className="w-full md:w-1/3 p-2.5 border border-blue-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 uppercase font-bold" />
          </div>
        )}

        {/* Purchase Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Purchase Date</label>
            <input type="date" {...register("purchaseDate")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Price / Value (RM)</label>
            <input type="number" step="0.01" {...register("price")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500" />
          </div>
        </div>

        {/* Description */}
        <div className="pt-6 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-2">Description / Notes</label>
          <textarea rows={3} {...register("description")} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"></textarea>
        </div>

      </div>

      <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-end">
        <button 
          disabled={isSubmitting} 
          type="submit" 
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-bold transition flex items-center shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Register Asset
        </button>
      </div>
    </form>
  )
}
