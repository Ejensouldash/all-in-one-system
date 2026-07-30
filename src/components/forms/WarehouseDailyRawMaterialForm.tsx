"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { Plus, Trash2, Save, ArrowLeft, QrCode } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { QRScannerModal } from "@/components/forms/QRScannerModal"
import { saveDailyRawMaterialReport } from "@/app/actions/warehouseDailyRawMaterial"

export function WarehouseDailyRawMaterialForm({ 
  userName, 
  userId,
  initialItems = [] 
}: { 
  userName: string, 
  userId: string,
  initialItems?: any[] 
}) {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      shift: new Date().getHours() >= 19 || new Date().getHours() < 7 ? "PM" : "AM",
      preparedBy: userName,
      createdById: userId,
      remarks: "",
      items: initialItems.length > 0 ? initialItems : []
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const watchItems = watch("items")

  const handleQRScan = (decodedText: string) => {
    let scannedBatch = ""
    let scannedSku = ""

    const text = decodedText.trim()

    // 1. Try parsing JSON
    if (text.startsWith("{") && text.endsWith("}")) {
      try {
        const parsed = JSON.parse(text)
        if (parsed.batch) scannedBatch = String(parsed.batch).trim().toUpperCase()
        if (parsed.sku) scannedSku = String(parsed.sku).trim()
      } catch (e) {}
    }

    // 2. Try parsing URL parameters
    if (!scannedBatch && (text.includes("batch=") || text.includes("?"))) {
      try {
        const dummyUrl = text.startsWith("http") ? text : `http://localhost/${text.startsWith("?") ? text : "?" + text}`
        const urlObj = new URL(dummyUrl)
        const bParam = urlObj.searchParams.get("batch")
        const sParam = urlObj.searchParams.get("sku")
        if (bParam) scannedBatch = bParam.trim().toUpperCase()
        if (sParam) scannedSku = sParam.trim()
      } catch (e) {}
    }

    // 3. Fallback
    if (!scannedBatch) {
      scannedBatch = text.toUpperCase()
    }

    if (!scannedBatch) {
      alert("Tak dapat membaca Nombor Batch daripada QR Code ini.")
      setIsScannerOpen(false)
      return
    }

    // Prevent duplicate scans
    const isDuplicate = watchItems.some((item: any) => (item.batchNo || "").trim().toUpperCase() === scannedBatch)
    if (isDuplicate) {
      alert(`⚠️ DUPLICATE DETECTED: Batch ${scannedBatch} sudah dimasukkan!`)
      setIsScannerOpen(false)
      return
    }

    // Determine target category based on scanned SKU or default
    let targetSection = "BOTTLES 425 ML"
    let targetSku = "425 ML"
    let targetUnit = "BAG"
    
    if (scannedSku) {
      const upperSku = scannedSku.toUpperCase()
      if (upperSku.includes("BOX")) {
        targetSection = "BOX 425 ML"
        targetUnit = "PCS"
        targetSku = upperSku.includes("24") ? "(425 ml x 24)" : "(425 ml x 6)"
      } else if (upperSku.includes("LABEL")) {
        targetSection = "LABEL 425 ML"
        targetSku = "LABEL 425 ML"
        targetUnit = "ROLL"
      }
    }

    append({
      section: targetSection,
      sku: targetSku,
      unit: targetUnit,
      batchNo: scannedBatch,
      balanceInWarehouse: 0,
      quantityStockIn: 0,
      quantityStockOut: 0,
      remarks: ""
    })

    alert(`✅ Batch ${scannedBatch} berjaya dimasukkan!`)
    setIsScannerOpen(false)
  }

  const onSubmit = async (data: any) => {
    if (!data.items || data.items.length === 0) {
      alert('Sila masukkan sekurang-kurangnya satu item.')
      return
    }
    
    for (let i = 0; i < data.items.length; i++) {
       if (!data.items[i].batchNo) {
          alert(`Sila isikan Batch No untuk item #${i + 1}.`)
          return
       }
    }

    setIsSubmitting(true)
    const res = await saveDailyRawMaterialReport(data)
    setIsSubmitting(false)
    
    if (res.success) {
      alert('Berjaya disimpan!')
      router.push("/forms/warehouse/reports/daily-raw-material")
    } else {
      alert(res.error)
    }
  }

  const addManualRow = () => {
    append({
      section: "BOTTLES 425 ML",
      sku: "425 ML",
      unit: "BAG",
      batchNo: "",
      balanceInWarehouse: 0,
      quantityStockIn: 0,
      quantityStockOut: 0,
      remarks: ""
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
          <input type="date" {...register("date")} className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
          <input type="time" {...register("time")} className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prepared By</label>
          <input type="text" {...register("preparedBy")} className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" readOnly />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Raw Material Logs</h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR</span>
            </button>
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
            <tr>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Batch No</th>
              <th className="px-4 py-3">Bal. In Whse</th>
              <th className="px-4 py-3 text-emerald-600">+ Qty In</th>
              <th className="px-4 py-3 text-rose-600">- Qty Out</th>
              <th className="px-4 py-3 text-blue-600">= Carry Forward</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const bIn = Number(watchItems[index]?.balanceInWarehouse) || 0
              const qIn = Number(watchItems[index]?.quantityStockIn) || 0
              const qOut = Number(watchItems[index]?.quantityStockOut) || 0
              const carryFwd = (bIn + qIn) - qOut

              return (
                <tr key={field.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-2 py-2">
                    <select {...register(`items.${index}.section`)} className="w-full border-gray-300 rounded p-1 text-xs">
                      <option value="BOTTLES 425 ML">BOTTLES 425 ML</option>
                      <option value="BOX 425 ML">BOX 425 ML</option>
                      <option value="LABEL 425 ML">LABEL 425 ML</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select {...register(`items.${index}.sku`)} className="w-full border-gray-300 rounded p-1 text-xs">
                      <option value="425 ML">425 ML (BAG)</option>
                      <option value="(425 ml x 6)">(425 ml x 6) (PCS)</option>
                      <option value="(425 ml x 24)">(425 ml x 24) (PCS)</option>
                      <option value="LABEL 425 ML">LABEL 425 ML (ROLL)</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" {...register(`items.${index}.batchNo`)} className="w-full border-gray-300 rounded p-1 uppercase text-xs" placeholder="Batch..." />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" {...register(`items.${index}.balanceInWarehouse`, { valueAsNumber: true })} className="w-20 border-gray-300 rounded p-1 text-center font-bold bg-gray-100" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" {...register(`items.${index}.quantityStockIn`, { valueAsNumber: true })} className="w-20 border-gray-300 rounded p-1 text-center text-emerald-600 font-bold" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" {...register(`items.${index}.quantityStockOut`, { valueAsNumber: true })} className="w-20 border-gray-300 rounded p-1 text-center text-rose-600 font-bold" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="w-20 text-center font-bold p-1 bg-blue-50 text-blue-700 rounded">
                      {carryFwd}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            
            {fields.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Tiada item. Sila scan QR atau tambah baris baru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="bg-gray-50 p-3 border-t border-gray-300 flex flex-wrap gap-3 mt-4">
          <button type="button" onClick={addManualRow} className="text-xs font-black uppercase tracking-wider flex items-center text-black border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
            <Plus className="h-4 w-4 mr-2" /> Add Row
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
        <Link href="/forms/warehouse/reports/daily-raw-material" className="text-gray-600 font-medium hover:text-gray-900 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">Saving...</span>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Report
            </>
          )}
        </button>
      </div>

      <QRScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScan}
      />
    </form>
  )
}
