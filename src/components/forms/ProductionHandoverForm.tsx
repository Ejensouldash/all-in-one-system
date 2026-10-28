"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { ArrowLeft, Save, Loader2, FileCheck2, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { createHandover } from "@/app/actions/handover"
import { GenericSignatureModal } from "./GenericSignatureModal"

function formatSKU(sku: string) {
  if (!sku) return sku;
  return sku.replace('p800_', '800ml x ').replace('p425_', '425ml x ').toUpperCase();
}

export function ProductionHandoverForm({ userId, userName, eligibleReports }: { userId: string, userName: string, eligibleReports: any[] }) {
  const [selectedReportId, setSelectedReportId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)

  const { register, control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      dailyReportId: "",
      items: [] as any[]
    }
  })

  const { fields, replace } = useFieldArray({ control, name: "items" })
  const watchItems = watch("items")

  const handleReportSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const reportId = e.target.value
    setSelectedReportId(reportId)
    setValue("dailyReportId", reportId)

    if (!reportId) {
      replace([])
      return
    }

    const report = eligibleReports.find(r => r.id === reportId)
    if (report) {
      // Flatten all batches from all productions
      const newItems = report.productions.flatMap((prod: any) => 
        prod.batches.map((batch: any) => ({
          category: prod.productType,
          batchNo: batch.batchNo,
          type: batch.type,
          totalProducedPcs: batch.qty,
          deductions: [],
          netToWarehousePcs: batch.qty
        }))
      )
      replace(newItems)
    }
  }

  const addDeduction = (itemIndex: number) => {
    const currentDeductions = watchItems[itemIndex]?.deductions || []
    setValue(`items.${itemIndex}.deductions`, [...currentDeductions, { destination: "", qtyPcs: 0, remarks: "" }])
  }

  const removeDeduction = (itemIndex: number, deductionIndex: number) => {
    const currentDeductions = [...(watchItems[itemIndex]?.deductions || [])]
    currentDeductions.splice(deductionIndex, 1)
    
    // Recalculate net
    const totalDed = currentDeductions.reduce((sum: number, d: any) => sum + (Number(d.qtyPcs) || 0), 0)
    setValue(`items.${itemIndex}.netToWarehousePcs`, Math.max(0, watchItems[itemIndex].totalProducedPcs - totalDed))
    setValue(`items.${itemIndex}.deductions`, currentDeductions)
  }

  const updateDeduction = (itemIndex: number, deductionIndex: number, field: string, val: any) => {
    setValue(`items.${itemIndex}.deductions.${deductionIndex}.${field}`, val)

    if (field === 'qtyPcs') {
      const currentDeductions = watchItems[itemIndex]?.deductions || []
      let totalDed = 0
      currentDeductions.forEach((d: any, idx: number) => {
        if (idx === deductionIndex) {
          totalDed += (Number(val) || 0)
        } else {
          totalDed += (Number(d.qtyPcs) || 0)
        }
      })
      setValue(`items.${itemIndex}.netToWarehousePcs`, Math.max(0, watchItems[itemIndex].totalProducedPcs - totalDed))
    }
  }

  const onSubmit = async (data: any) => {
    if (!data.dailyReportId) return alert("Please select a Daily Report.")
    
    if (!data.items || data.items.length === 0) {
      return alert("Laporan harian ini tidak mengandungi sebarang kumpulan pengeluaran (batch). Handover tidak boleh dicipta.")
    }

    const totalNet = data.items.reduce((sum: number, item: any) => sum + (Number(item.netToWarehousePcs) || 0), 0)
    if (totalNet <= 0) {
      return alert("Jumlah kuantiti bersih ke warehouse mesti melebihi 0.")
    }

    // Check if any net is negative (should be handled by Math.max but just in case)
    const invalid = data.items.some((i: any) => i.netToWarehousePcs < 0 || i.totalProducedPcs < 0)
    if (invalid) return alert("Invalid quantities detected. Deductions cannot exceed total produced.")

    setIsSignModalOpen(true)
  }

  const handleSignAndSubmit = async (signatureData: string) => {
    setIsSubmitting(true)
    const data = watch()
    const payload = {
      ...data,
      productionStaffId: userId,
      signature: signatureData
    }

    const result = await createHandover(payload)
    setIsSubmitting(false)
    setIsSignModalOpen(false)

    if (result.success) {
      alert("Handover Form generated and sent to Warehouse successfully!")
      window.location.href = "/forms/production"
    } else {
      alert("Error: " + result.error)
    }
  }

  return (
    <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
      <div className="border-b-[3px] border-black p-6 bg-amber-50 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <Link href="/forms/production" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 mb-6 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Production
          </Link>
          <div className="flex items-center">
            <FileCheck2 className="h-10 w-10 mr-4 text-amber-700" />
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Production Handover</h1>
          </div>
          <p className="font-bold text-gray-600 uppercase tracking-widest text-sm mt-2 ml-14">Nota Serahan Produksi</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {/* Step 1: Select Report */}
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black uppercase tracking-wider mb-6 flex items-center">
            <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full mr-3 text-sm">1</span>
            Select Approved Daily Report
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Daily Report</label>
              <select 
                value={selectedReportId} 
                onChange={handleReportSelection}
                className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="">-- Select Report --</option>
                {eligibleReports.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.time || 'N/A'} | {new Date(r.date).toLocaleDateString('en-GB')} | Line {r.line}
                  </option>
                ))}
              </select>
              {eligibleReports.length === 0 && (
                <p className="text-sm text-red-600 font-bold mt-2">No approved reports available for handover.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Handover Date</label>
              <input type="date" {...register("date")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50" readOnly />
            </div>
          </div>
        </div>

        {/* Step 2: Review & Deductions */}
        {selectedReportId && (
          <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase tracking-wider mb-6 flex items-center">
              <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full mr-3 text-sm">2</span>
              Output & Deductions
            </h2>
            <p className="text-sm text-gray-600 font-medium mb-6">
              Below is the total output extracted from the Daily Report. If any items were distributed directly (e.g., to Staff, Tahfiz) before reaching the Warehouse, add them as Deductions.
            </p>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const item = watchItems[index]
                const deductions = item.deductions || []
                
                return (
                  <div key={field.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    {/* Item Header */}
                    <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">SKU</span>
                        <div className="font-black text-lg">{formatSKU(item.category)}</div>
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Batch No</span>
                        <div className="font-bold text-gray-800">{item.batchNo}</div>
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Type</span>
                        <div className="font-bold text-gray-800">{item.type || 'Standard'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Total Produced (Pcs)</span>
                        <div className="font-black text-xl text-blue-700">{item.totalProducedPcs}</div>
                      </div>
                    </div>

                    {/* Deductions Section */}
                    <div className="p-4 bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-700">Direct Deductions</h4>
                        <button 
                          type="button" 
                          onClick={() => addDeduction(index)}
                          className="text-xs font-black uppercase tracking-wider flex items-center text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 hover:bg-red-100 transition-colors rounded"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Deduction
                        </button>
                      </div>

                      {deductions.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No deductions. All items will be transferred to Warehouse.</p>
                      ) : (
                        <div className="space-y-3">
                          {deductions.map((d: any, dIdx: number) => (
                            <div key={dIdx} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded border border-gray-200">
                              <div className="w-full sm:w-1/3">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Destination (e.g. Staff)</label>
                                <input 
                                  type="text" 
                                  value={d.destination}
                                  onChange={(e) => updateDeduction(index, dIdx, 'destination', e.target.value)}
                                  className="w-full border-2 border-gray-300 p-2 font-bold text-sm focus:border-black outline-none" 
                                  placeholder="Tahfiz / Staff"
                                />
                              </div>
                              <div className="w-full sm:w-1/4">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Qty (Pcs)</label>
                                <input 
                                  type="number"
                                  min="0"
                                  value={d.qtyPcs || ''}
                                  onChange={(e) => updateDeduction(index, dIdx, 'qtyPcs', parseInt(e.target.value) || 0)}
                                  className="w-full border-2 border-gray-300 p-2 font-bold text-sm focus:border-black outline-none text-center text-red-600" 
                                  placeholder="0"
                                />
                              </div>
                              <div className="w-full sm:w-1/3">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Remarks</label>
                                <input 
                                  type="text" 
                                  value={d.remarks}
                                  onChange={(e) => updateDeduction(index, dIdx, 'remarks', e.target.value)}
                                  className="w-full border-2 border-gray-300 p-2 font-bold text-sm focus:border-black outline-none" 
                                  placeholder="Optional..."
                                />
                              </div>
                              <button 
                                type="button" 
                                onClick={() => removeDeduction(index, dIdx)}
                                className="bg-white border-2 border-gray-300 p-2 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resulting Net to Warehouse */}
                    <div className="bg-emerald-50 p-4 border-t-2 border-emerald-200 flex justify-between items-center">
                      <span className="font-black uppercase text-sm tracking-wider text-emerald-800">Net Transfer to Warehouse:</span>
                      <span className="font-black text-2xl text-emerald-700">{item.netToWarehousePcs} <span className="text-sm">Pcs</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="pt-6 border-t-[3px] border-black flex justify-end">
          <button 
            disabled={isSubmitting || !selectedReportId} 
            onClick={handleSubmit(onSubmit)}
            className="w-full md:w-auto bg-amber-500 text-black px-10 py-4 font-black uppercase tracking-widest text-lg hover:bg-amber-400 transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] flex items-center justify-center border-[3px] border-black disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-6 w-6 mr-3 animate-spin" /> : <Save className="h-6 w-6 mr-3" />} 
            Sign & Send to Warehouse
          </button>
        </div>

      </div>

      {isSignModalOpen && (
        <GenericSignatureModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          onConfirm={handleSignAndSubmit}
          userName={userName}
          role="Production Staff"
          title="Sign Handover Form"
        />
      )}
    </div>
  )
}
