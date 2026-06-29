"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { processGoodsReturn } from "@/app/actions/warehouse"
import { Loader2, AlertTriangle, Save } from "lucide-react"

export function ReturnForm({ doOrder, userId }: { doOrder: any, userId: string }) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      sku: "",
      batchNumber: "",
      qtyReturned: 1,
      reason: "DAMAGE"
    }
  })

  const watchSku = watch("sku")
  
  // Filter batches based on selected SKU
  const availableBatchesForSku = watchSku ? doOrder.items.filter((item: any) => item.sku === watchSku) : []

  // Get max allowed return based on selected batch
  const watchBatch = watch("batchNumber")
  const selectedItem = availableBatchesForSku.find((i: any) => i.batchNumber === watchBatch)
  const maxAllowed = selectedItem ? selectedItem.qtySent : 0

  const onSubmit = async (data: any) => {
    setLoading(true)
    const result = await processGoodsReturn(doOrder.id, data.sku, data.batchNumber, Number(data.qtyReturned), data.reason)
    if (result.success) {
      alert("Return / Damage logged successfully!")
      window.location.href = "/forms/warehouse/quarantine"
    } else {
      alert("Error logging return: " + result.error)
      setLoading(false)
    }
  }

  // Unique SKUs sent in this DO
  const uniqueSkus = Array.from(new Set(doOrder.items.map((item: any) => item.sku))) as string[]

  const labels: Record<string, string> = {
    "p425_24": "BUBBLES O2 425 ML x 24",
    "p425_6": "BUBBLES O2 425 ML x 6",
    "p800_12": "BUBBLES O2 800 ML x 12",
    "p800_20": "BUBBLES O2 800 ML x 20",
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
      
      <div className="bg-gray-100 p-4 border-2 border-gray-200 rounded">
        <h3 className="font-black mb-2 uppercase text-gray-700 text-sm">DO Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm font-bold">
          <p>DO NUMBER: <span className="text-blue-700">{doOrder.doNumber}</span></p>
          <p>DESTINATION: {doOrder.destination}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-wider mb-2">Select Item to Return</label>
        <select {...register("sku", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black rounded">
          <option value="">-- Choose Item --</option>
          {uniqueSkus.map(sku => (
            <option key={sku} value={sku}>{labels[sku] || sku}</option>
          ))}
        </select>
      </div>

      {watchSku && (
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-2">Select Affected Batch</label>
          <select {...register("batchNumber", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black rounded">
            <option value="">-- Choose Batch --</option>
            {availableBatchesForSku.map((item: any) => (
              <option key={item.id} value={item.batchNumber}>
                Batch: {item.batchNumber} (Sent: {item.qtySent})
              </option>
            ))}
          </select>
        </div>
      )}

      {watchBatch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Quantity Returned</label>
            <input 
              type="number" 
              min="1" 
              max={maxAllowed}
              {...register("qtyReturned", { required: true, min: 1, max: maxAllowed })} 
              className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black rounded"
            />
            <p className="text-xs font-bold text-gray-500 mt-1">Max allowed: {maxAllowed}</p>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Reason</label>
            <select {...register("reason", { required: true })} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black rounded">
              <option value="DAMAGE">Damaged Goods</option>
              <option value="DELIVERY_FAIL">Delivery Failed / Rejected</option>
              <option value="WRONG_PO">Wrong Purchase Order</option>
            </select>
          </div>
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading || !watchBatch}
        className="w-full mt-4 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 text-lg tracking-wide uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <AlertTriangle className="w-6 h-6 mr-2" />}
        {loading ? "Processing..." : "Log Quarantine / Return"}
      </button>

    </form>
  )
}
