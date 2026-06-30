"use client"

import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { createDistributionOrder } from "@/app/actions/warehouse"
import { Loader2, Plus, Trash2, Save, FileText, Truck, MapPin, QrCode } from "lucide-react"
import { GMPHeader } from "@/components/GMPHeader"
import { QRScannerModal } from "@/components/forms/QRScannerModal"

const DISTRIBUTION_METHODS = [
  "Logistic",
  "SPX",
  "JNT",
  "NinjaVan",
  "Direct Customer",
  "Pickup",
  "Sponsorship"
]

const SKU_CONFIG = [
  { id: "p425_24", label: "BUBBLES O2 425 ML x 24" },
  { id: "p425_6", label: "BUBBLES O2 425 ML x 6" },
  { id: "p800_12", label: "BUBBLES O2 800 ML x 12" },
  { id: "p800_20", label: "BUBBLES O2 800 ML x 20" },
]

export function CreateDOForm({ availableInventory, userId }: { availableInventory: any[], userId: string }) {
  const [loading, setLoading] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  
  const { register, control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<any>({
    defaultValues: {
      distributionDate: new Date().toISOString().slice(0, 10),
      destination: "",
      distributionMethod: "Logistic",
      sponsorshipDetails: "",
      vehicleNo: "",
      driverName: "",
      items: SKU_CONFIG.map(sku => ({ sku: sku.id, batches: [] }))
    }
  })

  const batches0 = useFieldArray({ control, name: 'items.0.batches' })
  const batches1 = useFieldArray({ control, name: 'items.1.batches' })
  const batches2 = useFieldArray({ control, name: 'items.2.batches' })
  const batches3 = useFieldArray({ control, name: 'items.3.batches' })
  const fieldArrays = [batches0, batches1, batches2, batches3]

  // Watch top-level fields
  const watchMethod = watch("distributionMethod")
  const watchItems = watch("items")

  const handleScan = (decodedText: string) => {
    const batchNumber = decodedText.trim()
    const batchData = availableInventory.find((b: any) => b.batchNumber === batchNumber)
    
    if (!batchData) {
      alert(`Batch ${batchNumber} not found in active inventory!`)
      return
    }

    const skuIndex = SKU_CONFIG.findIndex(s => s.id === batchData.sku)
    if (skuIndex === -1) {
      alert(`SKU ${batchData.sku} is not configured in this form.`)
      return
    }

    const currentBatches = getValues(`items.${skuIndex}.batches`) || []
    
    if (currentBatches.some((b: any) => b.batchNumber === batchNumber)) {
      alert(`Batch ${batchNumber} is already added to the list!`)
      setIsScannerOpen(false)
      return
    }

    fieldArrays[skuIndex].append({ batchNumber: batchNumber, qtySent: "" })
    
    alert(`Batch ${batchNumber} added successfully! Please enter quantity.`)
    setIsScannerOpen(false)
  }

  const onSubmit = async (data: any) => {
    setLoading(true)
    
    // Flatten items payload
    const formattedItems: any[] = []
    
    for (const skuGroup of data.items) {
      if (skuGroup.batches) {
        for (const batch of skuGroup.batches) {
          if (batch.batchNumber && batch.qtySent > 0) {
            formattedItems.push({
              sku: skuGroup.sku,
              batchNumber: batch.batchNumber,
              qtySent: Number(batch.qtySent)
            })
          }
        }
      }
    }

    if (formattedItems.length === 0) {
      alert("Please add at least one batch to transfer.")
      setLoading(false)
      return
    }

    const payload = {
      distributionDate: data.distributionDate,
      destination: data.destination,
      distributionMethod: data.distributionMethod,
      sponsorshipDetails: data.distributionMethod === 'Sponsorship' ? data.sponsorshipDetails : null,
      vehicleNo: data.vehicleNo || null,
      driverName: data.driverName || null,
      createdById: userId,
      items: formattedItems
    }

    const result = await createDistributionOrder(payload as any)
    if (result.success) {
      alert("Distribution Order created and stock deducted!")
      window.location.href = "/forms/warehouse/distribution"
    } else {
      alert("Error: " + result.error)
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <GMPHeader />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      {/* SECTION A: DELIVERY INFO */}
      <div className="bg-white p-6 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center border-b-2 border-black pb-3">
          <Truck className="mr-3 w-6 h-6" /> 1. Delivery Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Transfer Date</label>
            <input type="date" {...register("distributionDate", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 rounded" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Transfer To (Destination)</label>
            <input type="text" placeholder="e.g. Hub Kedah / Mydin" {...register("destination", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black rounded" />
          </div>
          
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Distribution Method</label>
            <select {...register("distributionMethod")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white rounded">
              {DISTRIBUTION_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {watchMethod === "Sponsorship" && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-indigo-700">Sponsor To (Fill in the blank)</label>
              <input type="text" placeholder="e.g. Majlis Sukan Negara" {...register("sponsorshipDetails", { required: true })} className="w-full border-2 border-indigo-400 bg-indigo-50 p-3 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded" />
            </div>
          )}

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-500">Lorry / Vehicle No (Optional)</label>
              <input type="text" placeholder="Plate No" {...register("vehicleNo")} className="w-full border-2 border-gray-300 p-3 font-bold focus:outline-none focus:border-black rounded" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-500">Driver Name (Optional)</label>
              <input type="text" placeholder="Name" {...register("driverName")} className="w-full border-2 border-gray-300 p-3 font-bold focus:outline-none focus:border-black rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: ITEM SELECTION */}
      <div className="bg-white p-6 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-end border-b-2 border-black pb-3 mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center">
            <FileText className="mr-3 w-6 h-6" /> 2. Items & Batch Selection
          </h2>
          <button 
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 font-black uppercase text-sm rounded border-2 border-indigo-900 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
          >
            <QrCode className="w-5 h-5 mr-2" /> Scan QR
          </button>
        </div>
        
        <div className="space-y-6">
          {SKU_CONFIG.map((skuConf, skuIndex) => (
            <div key={skuConf.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-100 p-4 border-b-2 border-gray-200 flex justify-between items-center">
                <h3 className="font-black text-lg tracking-tight uppercase text-gray-800">{skuConf.label}</h3>
              </div>
              <div className="p-4 bg-white">
                <BatchRows 
                  skuId={skuConf.id} 
                  skuIndex={skuIndex} 
                  control={control} 
                  register={register}
                  watchItems={watchItems}
                  availableInventory={availableInventory}
                  fieldArray={fieldArrays[skuIndex]}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center bg-black hover:bg-gray-800 text-white font-black py-5 px-6 text-xl tracking-wide uppercase transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Save className="w-6 h-6 mr-2" />}
        {loading ? "Processing..." : "Generate Distribution Order (DO)"}
      </button>
    </form>
    
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />
    </div>
  )
}

function BatchRows({ skuId, skuIndex, control, register, watchItems, availableInventory, fieldArray }: any) {
  const { fields, remove, append } = fieldArray;

  // Filter inventory batches for this specific SKU
  const availableBatchesForSku = availableInventory.filter((inv: any) => inv.sku === skuId);

  if (availableBatchesForSku.length === 0) {
    return (
      <div className="text-center py-4 px-2">
        <p className="text-sm font-bold text-gray-400 uppercase">Out of Stock</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="text-center py-2">
          <p className="text-sm font-medium text-gray-500 mb-3">No batches selected.</p>
        </div>
      )}
      
      {fields.map((field: any, batchIndex: number) => {
        // Watch the currently selected batch number to enforce max limits
        const currentBatchNo = watchItems[skuIndex]?.batches?.[batchIndex]?.batchNumber;
        const currentBatch = availableBatchesForSku.find((b: any) => b.batchNumber === currentBatchNo);
        const maxAllowed = currentBatch ? currentBatch.availableBalance : 0;
        const currentQty = watchItems[skuIndex]?.batches?.[batchIndex]?.qtySent || 0;
        const isError = currentQty > maxAllowed;

        return (
          <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded border border-gray-200">
            <div className="flex-1 w-full">
              <label className="block sm:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Select Batch</label>
              <select 
                {...register(`items.${skuIndex}.batches.${batchIndex}.batchNumber`, { required: true })}
                className="w-full border-2 border-black p-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black rounded"
              >
                <option value="">-- Choose Batch --</option>
                {availableBatchesForSku.map((inv: any) => (
                  <option key={inv.id} value={inv.batchNumber}>
                    Batch: {inv.batchNumber} (Available: {inv.availableBalance} box)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-32 flex-shrink-0">
              <label className="block sm:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Quantity</label>
              <input 
                type="number" 
                min="1"
                max={maxAllowed > 0 ? maxAllowed : undefined}
                placeholder="Qty"
                {...register(`items.${skuIndex}.batches.${batchIndex}.qtySent`, { required: true, min: 1, max: maxAllowed > 0 ? maxAllowed : undefined })}
                className={`w-full border-2 p-2 text-center text-sm font-black outline-none rounded ${
                  isError ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500' : 'border-black bg-white text-black focus:ring-1 focus:ring-black'
                }`}
              />
            </div>

            <div className="flex items-center justify-end sm:justify-start gap-3 w-full sm:w-auto">
              <span className={`text-[10px] font-bold w-16 text-center ${isError ? 'text-red-600' : 'text-gray-500'}`}>
                Max: {maxAllowed}
              </span>
              <button 
                type="button" 
                onClick={() => remove(batchIndex)} 
                className="text-red-500 hover:bg-red-100 p-2 rounded"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      })}

      <div className="pt-2">
        <button 
          type="button" 
          onClick={() => append({ batchNumber: "", qtySent: "" })} 
          className="flex items-center text-xs font-black uppercase tracking-wider bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Batch for {SKU_CONFIG[skuIndex].label.split('O2 ')[1]}
        </button>
      </div>
    </div>
  );
}
