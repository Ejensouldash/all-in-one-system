"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { createAsset, uploadAssetPhotoAction } from "@/app/actions/asset"
import { Save, ArrowLeft, Loader2, Camera, Upload, X, Image as ImageIcon, Building2, MapPin } from "lucide-react"
import Link from "next/link"
import { CameraCaptureModal } from "@/components/forms/CameraCaptureModal"

export function AssetForm({ departments, locations }: { departments: any[], locations: any[] }) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    defaultValues: {
      condition: "Good"
    }
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const handleCapturePhoto = (file: File, previewUrl: string) => {
    setPhotoFile(file)
    setPhotoPreview(previewUrl)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      let uploadedUrl: string | null = null

      if (photoFile) {
        const formData = new FormData()
        formData.append("photo", photoFile)
        const uploadRes = await uploadAssetPhotoAction(formData)
        if (uploadRes.success && uploadRes.url) {
          uploadedUrl = uploadRes.url
        }
      }

      const payload = {
        name: data.name?.trim(),
        brand: data.brand?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        condition: data.condition || "Good",
        departmentId: data.departmentId || null,
        locationId: data.locationId || null,
        imageUrl: uploadedUrl,
      }

      const result = await createAsset(payload)
      if (result.success) {
        alert("Asset registered successfully!")
        router.push("/dashboard/assets/list")
      } else {
        alert(result.error || "Failed to register asset.")
        setIsSubmitting(false)
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.")
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Register New Asset</h2>
            <p className="text-xs text-slate-500 mt-1">Fill in the asset information according to company asset registry standards.</p>
          </div>
          <Link 
            href="/dashboard/assets/list" 
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center transition bg-white text-slate-700 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to List
          </Link>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Row 1: Department & Item Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select 
                  {...register("departmentId", { required: true })} 
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 bg-white font-medium text-sm text-slate-800"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {errors.departmentId && <p className="text-xs text-red-500 font-semibold mt-1">Please select a department.</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Item (Asset Name) <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Handphone, Meja, Dell Laptop..."
                {...register("name", { required: true })} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 text-sm font-semibold text-slate-900"
              />
              {errors.name && <p className="text-xs text-red-500 font-semibold mt-1">Asset item name is required.</p>}
            </div>
          </div>

          {/* Row 2: Brand & Barcode / Serial Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Brand
              </label>
              <input 
                type="text" 
                placeholder="e.g. Samsung, HP, Amgrass..."
                {...register("brand")} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 text-sm font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Barcode / Serial Number
              </label>
              <input 
                type="text" 
                placeholder="e.g. GRN 359122728149930, MJ-001..."
                {...register("serialNumber")} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 text-sm font-mono font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Leave blank if no serial code or barcode is present on the asset.</p>
            </div>
          </div>

          {/* Row 3: Location & Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Location
              </label>
              <select 
                {...register("locationId")} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 bg-white font-medium text-sm text-slate-800"
              >
                <option value="">-- Select Location --</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Condition
              </label>
              <select 
                {...register("condition")} 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 bg-white font-bold text-sm text-slate-800"
              >
                <option value="Good">Good</option>
                <option value="Usable">Usable</option>
                <option value="Bad">Bad (Requires Maintenance)</option>
                <option value="Unused">Unused / Disposed</option>
              </select>
            </div>
          </div>

          {/* Row 4: Photo / Camera Feature (Requirement 5) */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Asset Photo
            </label>
            
            {photoPreview ? (
              <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <img 
                  src={photoPreview} 
                  alt="Asset Preview" 
                  className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-xs" 
                />
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-bold text-emerald-700">Photo captured & attached</p>
                  <p className="text-[11px] text-slate-400">This photo will be saved with the asset record.</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                    >
                      Retake
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
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Camera Capture Trigger */}
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="p-5 border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50 rounded-2xl flex flex-col items-center justify-center gap-2 transition group text-teal-800"
                >
                  <div className="p-3 bg-white rounded-full shadow-xs group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-teal-600" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Open Camera</span>
                  <span className="text-[11px] text-slate-400">Snap photo with mobile camera or webcam</span>
                </button>

                {/* Upload from Gallery / Device */}
                <label className="p-5 border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-100/60 rounded-2xl flex flex-col items-center justify-center gap-2 transition cursor-pointer text-slate-700 group">
                  <div className="p-3 bg-white rounded-full shadow-xs group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-slate-500" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Upload from Device</span>
                  <span className="text-[11px] text-slate-400">JPG, PNG, or WEBP photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </label>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link 
            href="/dashboard/assets/list" 
            className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          <button 
            disabled={isSubmitting} 
            type="submit" 
            className="bg-teal-600 hover:bg-teal-700 text-white px-7 py-2.5 rounded-xl text-xs font-bold transition flex items-center shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Register Asset
          </button>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <CameraCaptureModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturePhoto}
        title="Capture Asset Photo"
      />
    </>
  )
}
