"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { createDistributionOrder } from "@/app/actions/warehouse"
import { Loader2, Plus, Trash2, Save } from "lucide-react"

export function CreateDOForm({ availableInventory, userId }: { availableInventory: any[], userId: string }) {
  const [loading, setLoading] = useState(false)
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      distributionDate: new Date().toISOString().slice(0, 10),
      destination: "",
      distributionMethod: "LOGISTIC",
      vehicleNo: "",
      driverName: "",
      items: [{ sku: "", batchNumber: "", qtySent: 1 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  })

  const watchItems = watch("items")
  const watchMethod = watch("distributionMethod")

  const onSubmit = async (data: any) => {
    setLoading(true)
    // Map SKU from selected batch automatically
    const formattedItems = data.items.map((item: any) => {
      const batch = availableInventory.find(b => b.batchNumber === item.batchNumber)
      return {
        ...item,
        sku: batch ? batch.sku : "UNKNOWN",
        qtySent: Number(item.qtySent)
      }
    })

    const payload = {
      ...data,
      createdById: userId,
      items: formattedItems
    }

    const result = await createDistributionOrder(payload as any)
    if (result.success) {
      alert("Distribution Order created and stock deducted!")
      window.location.href = "/warehouse/distribution"
    } else {
      alert("Error: " + result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-2">Distribution Date</label>
          <input type="date" {...register("distributionDate", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-2">Destination (Customer / Hub)</label>
          <input type="text" placeholder="e.g. Aeon Big Wangsa Maju" {...register("destination", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-2">Distribution Method</label>
          <select {...register("distributionMethod")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white">
            <option value="LOGISTIC">External Logistic (3PL)</option>
            <option value="DIRECT_DC">Direct to DC</option>
            <option value="COURIER">Courier (e.g. JnT)</option>
            <option value="PICKUP">Self Pickup</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-500">Vehicle No (Optional)</label>
            <input type="text" placeholder="Plate No" {...register("vehicleNo")} className="w-full border-2 border-gray-300 p-3 font-bold focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-500">Driver Name (Optional)</label>
            <input type="text" placeholder="Name" {...register("driverName")} className="w-full border-2 border-gray-300 p-3 font-bold focus:outline-none focus:border-black" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t-2 border-dashed border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black uppercase tracking-tight">Outgoing Items</h3>
          <button type="button" onClick={() => append({ sku: "", batchNumber: "", qtySent: 1 })} className="flex items-center text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const currentBatchId = watchItems[index]?.batchNumber;
            const currentBatch = availableInventory.find(b => b.batchNumber === currentBatchId);
            const maxAllowed = currentBatch ? currentBatch.availableBalance : 0;

            return (
              <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 border border-gray-200">
                <div className="flex-1 w-full">
                  <label className="block sm:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Select Batch</label>
                  <select 
                    {...register(`items.${index}.batchNumber`, { required: true })}
                    className="w-full border-2 border-gray-300 p-2 text-sm font-bold focus:border-black outline-none"
                  >
                    <option value="">-- Choose Batch --</option>
                    {availableInventory.map(inv => (
                      <option key={inv.id} value={inv.batchNumber}>
                        {inv.sku} (Batch: {inv.batchNumber}) - {inv.availableBalance} left
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full sm:w-32 flex-shrink-0">
                  <label className="block sm:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Qty Sent</label>
                  <input 
                    type="number" 
                    min="1"
                    max={maxAllowed > 0 ? maxAllowed : undefined}
                    placeholder="Qty"
                    {...register(`items.${index}.qtySent`, { required: true, min: 1, max: maxAllowed > 0 ? maxAllowed : undefined })}
                    className={`w-full border-2 p-2 text-center text-sm font-black outline-none ${
                      (watchItems[index]?.qtySent > maxAllowed) ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-400 bg-blue-50 text-blue-900 focus:border-blue-700'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-3">
                  {currentBatch && (
                    <span className="text-[10px] font-bold text-gray-500 w-16 text-center">
                      Max: {maxAllowed}
                    </span>
                  )}
                  <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-100 p-2 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center bg-black hover:bg-gray-800 text-white font-black py-4 px-6 text-lg tracking-wide uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Save className="w-6 h-6 mr-2" />}
        {loading ? "Processing..." : "Generate Distribution Order (DO)"}
      </button>

    </form>
  )
}
