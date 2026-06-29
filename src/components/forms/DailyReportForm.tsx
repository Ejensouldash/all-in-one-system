"use client"

import { useForm, useFieldArray, useWatch, Control, UseFormRegister } from "react-hook-form"
import { Plus, Trash2, Save, ArrowLeft, Info, AlertTriangle, CheckCircle2, CloudDownload, Loader2, History, PenTool } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getActiveInventory, createDailyReport, updateDailyReport } from "@/app/actions/dailyReport"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

const MULTIPLIERS = {
  BOTTLE_800: [225],
  BOTTLE_425: [181, 162],
  CAP: [4000]
}

const PRODUCTION_CONFIG = {
  "LINE 1 - 800ml": [
    { id: "p800_12", label: "800 ml x 12", mult: 12 },
    { id: "p800_20", label: "800 ml x 20", mult: 20 }
  ],
  "LINE 2 - 425ml": [
    { id: "p425_24", label: "425 ml x 24", mult: 24 },
    { id: "p425_6", label: "425 ml x 6", mult: 6 }
  ]
}

export function DailyReportForm({ userName, initialData, reportId }: { userName: string, initialData?: any, reportId?: string }) {
  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: initialData || {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      shift: "AM",
      line: "LINE 1 - 800ml" as keyof typeof PRODUCTION_CONFIG,
      preparedBy: userName || "",
      preparedSignature: "",
      verifiedBy: "",
      
      production: {
        p800_12: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard Front", otherType: "" }] },
        p800_20: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard Front", otherType: "" }] },
        p425_24: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard Front", otherType: "" }] },
        p425_6:  { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard Front", otherType: "" }] },
      },

      totalManpower: "",
      rejectsScrap: { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} },
      rejectsReturn: { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} },
      breakdowns: [{ section: "Section Filling", downtime: "", reason: "" }],
      noRejects: false,

      // INVENTORY STATE STRUCTURE - V4.0 (Everything tracked in Bags)
      inventory: {
        BOTTLE: {
          sources: [{ batchNo: "", bags: 0, mult: 225 }],
          usages: [{ period: "Before", batchNo: "", bags: 0 }]
        },
        LABEL: {
          sources: [{ batchNo: "", bags: 0, mult: 1, labelType: "Standard Front" }],
          usages: [{ period: "Before", batchNo: "", bags: 0 }]
        },
        CAP: {
          sources: [{ batchNo: "", bags: 0, mult: 4000 }],
          usages: [{ period: "Before", batchNo: "", bags: 0 }]
        },
        BOX_p800_12: { sources: [{ batchNo: "", bags: 0, mult: 1 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        BOX_p800_20: { sources: [{ batchNo: "", bags: 0, mult: 1 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        BOX_p425_24: { sources: [{ batchNo: "", bags: 0, mult: 1 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        BOX_p425_6: { sources: [{ batchNo: "", bags: 0, mult: 1 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        CARTON_CAP: { sources: [{ batchNo: "", bags: 0, mult: 15 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        WRAPPING_HAND: { sources: [{ batchNo: "", bags: 0, mult: 6 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        WRAPPING_MACHINE: { sources: [{ batchNo: "", bags: 0, mult: 1 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        TAPE_OPP: { sources: [{ batchNo: "", bags: 0, mult: 96 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        TAPE_MACHINE: { sources: [{ batchNo: "", bags: 0, mult: 6 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] },
        MACHINE_STRETCH_FILM: { sources: [{ batchNo: "", bags: 0, mult: 1 }], usages: [{ period: "Before", batchNo: "", bags: 0 }] }
      },

      remarks: ""
    }
  })

  const watchLine = watch("line")
  const productionCheckboxes = watch("production")
  const watchRejectsScrap = useWatch({ control, name: "rejectsScrap" });
  const watchRejectsReturn = useWatch({ control, name: "rejectsReturn" });
  const { fields: breakdownFields, append: appendBreakdown, remove: removeBreakdown } = useFieldArray({ control, name: "breakdowns" });
  const watchNoRejects = watch("noRejects")

  const [syncedDOs, setSyncedDOs] = useState<any[]>([])
  const [availableCarryForward, setAvailableCarryForward] = useState<any[]>([])
  const [isFetchingSync, setIsFetchingSync] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Global Inventory on mount
  useEffect(() => {
    async function fetchInventory() {
      setIsFetchingSync(true)
      const res = await getActiveInventory()
      
      if (res.success) {
        setSyncedDOs(res.data.todayDOs)
        setAvailableCarryForward(res.data.storeroomBatches)
      }
      setIsFetchingSync(false)
    }
    fetchInventory()
  }, [])

  const showErrorAndScroll = (elementId: string, message: string) => {
    alert(message)
    const el = document.getElementById(elementId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = el.querySelector('input, select, textarea') as HTMLElement
      if (input) input.focus()
    }
  }

  const onSubmit = async (data: any) => {
    if (!data.date) return showErrorAndScroll('field-date', 'Please fill in the Production Date.')
    if (!data.time) return showErrorAndScroll('field-time', 'Please fill in the Production Time.')
    if (!data.preparedBy) return showErrorAndScroll('field-preparedBy', 'Please fill in the Prepared By name.')

    // Validate Production
    const config = PRODUCTION_CONFIG[data.line as keyof typeof PRODUCTION_CONFIG] || []
    for (const prod of config) {
      const prodData = data.production[prod.id]
      if (prodData?.checked) {
        if (!prodData.qty || Number(prodData.qty) <= 0) {
          return showErrorAndScroll(`field-production-${prod.id}`, `Please enter Total Produced (Box) for ${prod.label}.`)
        }
        const sum = prodData.batches.reduce((acc: number, b: any) => acc + (Number(b.qty) || 0), 0)
        if (sum !== Number(prodData.qty)) {
          return showErrorAndScroll(`field-production-${prod.id}`, `Distributed batches (${sum}) must match Total Produced (${prodData.qty}) for ${prod.label}.`)
        }
      }
    }

    // Validate Reject Tracking
    const totalRejects = Object.values(data.rejectsScrap).reduce((sum: number, curr: any) => sum + Number(curr.before) + Number(curr.after), 0) + Object.values(data.rejectsReturn).reduce((sum: number, curr: any) => sum + Number(curr.before) + Number(curr.after), 0)
    if (!data.noRejects && totalRejects === 0) {
      return showErrorAndScroll('section-rejects', "Please fill in the box for reject product (Wajib isi). Jika tiada barang reject, sila tick checkbox 'Tiada Barang Reject'.")
    }

    if (!data.preparedSignature) {
      return showErrorAndScroll('section-signature', 'Please provide a Digital Signature before submitting.')
    }

    if (data.noRejects) {
      data.rejectsScrap = { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} }; data.rejectsReturn = { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} }
    }

    setIsSubmitting(true)
    
    // Format CAP usages correctly based on weight
    const formattedData = { ...data };
    if (formattedData.inventory?.CAP?.usages) {
      formattedData.inventory.CAP.usages = formattedData.inventory.CAP.usages.map((u: any) => {
        const w = Number(u.weight) || 0;
        const b = Number(u.boxes) || 0;
        const net = w > 0 ? w - (b * 0.88) : 0;
        const pcs = net > 0 ? Math.round(net / 0.002125) : 0;
        
        let mult = 4000;
        const doMatch = syncedDOs.find((d: any) => d.batchNo === u.batchNo);
        if (doMatch) mult = Number(doMatch.mult) || 4000;
        else {
          const cfMatch = availableCarryForward.find((c: any) => c.batchNo === u.batchNo);
          if (cfMatch) mult = Number(cfMatch.mult) || 4000;
        }
        
        return { ...u, bags: pcs > 0 ? (pcs / mult) : 0 };
      });
    }

    const result = reportId ? await updateDailyReport(reportId, formattedData) : await createDailyReport(formattedData)
    setIsSubmitting(false)

    if (result.success) {
      alert("Success! Daily Report officially submitted to Supabase.")
      window.location.href = "/forms"
    } else {
      alert("Failed to submit: " + result.error)
    }
  }

  const renderProductionRow = (prodId: string, label: string) => {
    const isChecked = productionCheckboxes[prodId as keyof typeof productionCheckboxes]?.checked
    const totalQty = Number(productionCheckboxes[prodId as keyof typeof productionCheckboxes]?.qty) || 0
    return (
      <ProductionBatchDistribution 
        key={prodId} prodId={prodId} label={label} isChecked={isChecked} totalQty={totalQty} control={control} register={register}
      />
    )
  }

  return (
    <div className="bg-white text-black min-h-screen font-sans border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
      <div className="border-b-[3px] border-black p-6 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <Link href="/forms" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 mb-6 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Forms
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">KAR Production Daily Report</h1>
          <p className="font-bold text-gray-600 uppercase tracking-widest text-sm mt-2">Digital Operations Module v4.0</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-12">
        {/* SECTIONS 1, 2, 3 remain mostly the same UI-wise */}
        <section>
          <div className="flex items-center mb-6 border-b-[3px] border-black pb-2">
            <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">1</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Shift Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div id="field-date">
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Production Date</label>
              <input type="date" {...register("date")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div id="field-time">
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Time</label>
              <input type="time" {...register("time")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Shift</label>
              <select {...register("shift")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white">
                <option value="AM">AM (Pagi)</option>
                <option value="PM">PM (Malam)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Production Line</label>
              <select {...register("line")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white">
                <option value="LINE 1 - 800ml">LINE 1 - 800ml</option>
                <option value="LINE 2 - 425ml">LINE 2 - 425ml</option>
              </select>
            </div>
            <div id="field-preparedBy">
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Prepared By</label>
              <input type="text" {...register("preparedBy")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white uppercase" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Verified By</label>
              <input type="text" {...register("verifiedBy")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white uppercase" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Total Manpower</label>
              <div className="flex border-2 border-black focus-within:ring-2 focus-within:ring-black">
                <input type="number" {...register("totalManpower")} className="w-full p-3 font-bold focus:outline-none bg-white text-center" placeholder="___" />
                <div className="px-4 py-3 bg-gray-100 border-l-2 border-black font-black flex items-center text-gray-800">
                  / 10
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center mb-6 border-b-[3px] border-black pb-2">
            <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">2</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Production Output & Distribution</h2>
          </div>
          <div className="space-y-6">
            {PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG]?.map(prod => renderProductionRow(prod.id, prod.label))}
          </div>
        </section>

        <section id="section-rejects">
          <div className="flex items-center mb-4 border-b-[3px] border-black pb-2 justify-between">
            <div className="flex items-center">
              <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">3</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">Reject Tracking</h2>
            </div>
          </div>
          
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50 border-2 border-red-200 p-4">
            <p className="text-sm font-black uppercase text-red-600 tracking-wider">
              * Please fill in the box for reject product (Wajib Isi)
            </p>
            <label className="flex items-center cursor-pointer bg-white border-2 border-black p-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
              <input type="checkbox" {...register("noRejects")} className="w-5 h-5 accent-black border-2 border-black mr-3" />
              <span className="font-black uppercase tracking-widest text-sm text-black">Tiada Barang Reject</span>
            </label>
          </div>

          <div className="mb-6 bg-blue-50 border-2 border-blue-200 p-4">
            <h3 className="font-black uppercase tracking-widest mb-2 text-blue-800 text-sm">🧮 Cap Calculator (Auto-Convert Grams to Pcs)</h3>
            <p className="text-xs font-bold text-blue-600 mb-3">Formula: 1 Cap = 2.1g. Enter total weight in grams to calculate pieces.</p>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input 
                type="number" 
                placeholder="Weight (Grams)" 
                className="p-2 border-2 border-black font-bold outline-none focus:ring-2 focus:ring-black w-full sm:w-48"
                onChange={(e) => {
                  const weight = Number(e.target.value) || 0
                  const pcs = Math.round(weight / 2.1)
                  const el = document.getElementById('cap-calc-result')
                  if (el) el.innerText = pcs.toString() + ' Pcs'
                }}
              />
              <span className="font-black text-xl text-blue-800 mx-2">=</span>
              <div id="cap-calc-result" className="p-2 bg-white border-2 border-black font-black text-lg text-emerald-700 min-w-[100px] text-center">
                0 Pcs
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Table 1: Scrap / Disposal */}
            <div>
              <h3 className="font-black uppercase tracking-widest mb-3 bg-red-600 text-white px-4 py-2 inline-block">Scrap / Disposal (Reject Terus)</h3>
              <table className={`w-full border-[3px] border-black text-base transition-opacity ${watchNoRejects ? 'opacity-50 pointer-events-none' : ''}`}>
                <thead className="bg-gray-100 border-b-[3px] border-black">
                  <tr>
                    <th className="p-2 text-left border-r-[3px] border-black uppercase tracking-wider font-black text-xs">Item</th>
                    <th className="p-2 text-center border-r-[3px] border-black uppercase tracking-wider font-black text-xs">Before</th>
                    <th className="p-2 text-center border-r-[3px] border-black uppercase tracking-wider font-black text-xs">After</th>
                    <th className="p-2 text-center bg-gray-200 uppercase tracking-wider font-black text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {['CAP', 'BOTTLE', 'LABEL', 'BOX'].map((item) => {
                    const lowerItem = item.toLowerCase() as "cap" | "bottle" | "label" | "box"
                    const bef = Number(watchRejectsScrap?.[lowerItem]?.before) || 0
                    const aft = Number(watchRejectsScrap?.[lowerItem]?.after) || 0
                    return (
                      <tr key={item} className="border-b-[3px] border-black last:border-0 font-medium">
                        <td className="p-2 border-r-[3px] border-black font-black uppercase tracking-widest text-xs">{item}</td>
                        <td className="p-0 border-r-[3px] border-black bg-white">
                          <input type="number" {...register(`rejectsScrap.${lowerItem}.before`)} min="0" disabled={watchNoRejects} className="w-full h-full text-center p-3 outline-none hover:bg-red-50 focus:bg-red-50 font-black text-red-600 text-sm" />
                        </td>
                        <td className="p-0 border-r-[3px] border-black bg-white">
                          <input type="number" {...register(`rejectsScrap.${lowerItem}.after`)} min="0" disabled={watchNoRejects} className="w-full h-full text-center p-3 outline-none hover:bg-red-50 focus:bg-red-50 font-black text-red-600 text-sm" />
                        </td>
                        <td className="p-2 text-center bg-gray-100 font-black text-lg text-red-700">{bef + aft}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table 2: Return to Supplier */}
            <div>
              <h3 className="font-black uppercase tracking-widest mb-3 bg-red-600 text-white px-4 py-2 inline-block">Return to Supplier</h3>
              <table className={`w-full border-[3px] border-black text-base transition-opacity ${watchNoRejects ? 'opacity-50 pointer-events-none' : ''}`}>
                <thead className="bg-gray-100 border-b-[3px] border-black">
                  <tr>
                    <th className="p-2 text-left border-r-[3px] border-black uppercase tracking-wider font-black text-xs">Item</th>
                    <th className="p-2 text-center border-r-[3px] border-black uppercase tracking-wider font-black text-xs">Before</th>
                    <th className="p-2 text-center border-r-[3px] border-black uppercase tracking-wider font-black text-xs">After</th>
                    <th className="p-2 text-center bg-gray-200 uppercase tracking-wider font-black text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {['CAP', 'BOTTLE', 'LABEL', 'BOX'].map((item) => {
                    const lowerItem = item.toLowerCase() as "cap" | "bottle" | "label" | "box"
                    const bef = Number(watchRejectsReturn?.[lowerItem]?.before) || 0
                    const aft = Number(watchRejectsReturn?.[lowerItem]?.after) || 0
                    return (
                      <tr key={item} className="border-b-[3px] border-black last:border-0 font-medium">
                        <td className="p-2 border-r-[3px] border-black font-black uppercase tracking-widest text-xs">{item}</td>
                        <td className="p-0 border-r-[3px] border-black bg-white">
                          <input type="number" {...register(`rejectsReturn.${lowerItem}.before`)} min="0" disabled={watchNoRejects} className="w-full h-full text-center p-3 outline-none hover:bg-red-50 focus:bg-red-50 font-black text-red-600 text-sm" />
                        </td>
                        <td className="p-0 border-r-[3px] border-black bg-white">
                          <input type="number" {...register(`rejectsReturn.${lowerItem}.after`)} min="0" disabled={watchNoRejects} className="w-full h-full text-center p-3 outline-none hover:bg-red-50 focus:bg-red-50 font-black text-red-600 text-sm" />
                        </td>
                        <td className="p-2 text-center bg-gray-100 font-black text-lg text-red-700">{bef + aft}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 4: INVENTORY TRACKING V4.0 */}
        <section>
          <div className="flex items-center mb-6 border-b-[3px] border-black pb-2">
            <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">4</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Inventory & Material Tracking (Decoupled sync)</h2>
          </div>
          
          <div className="bg-emerald-50 border-[3px] border-emerald-200 p-5 mb-8 flex flex-col md:flex-row gap-6 shadow-sm">
            <div className="flex-shrink-0">
              <span className="bg-emerald-600 text-white px-3 py-1 font-black uppercase tracking-widest text-xs inline-block mb-2">V4.0 Workflow</span>
              <p className="font-bold text-emerald-900 mb-1 text-lg">Bag-Level Tracking & DO Sync</p>
              <ul className="list-decimal list-inside text-emerald-800 text-sm font-medium space-y-1">
                <li><strong>Transfer In</strong> data is automatically pulled from the Warehouse DO form.</li>
                <li><strong>Storeroom</strong> balances are recorded purely in <strong>Bags</strong>.</li>
                <li><strong>Usage</strong> logs are recorded purely in <strong>Bags</strong>.</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full text-sm font-black uppercase text-emerald-900">
              <div className="bg-white border-2 border-emerald-200 p-3">
                <span className="block text-xs text-emerald-500 mb-1">BOTTLE (800ml)</span>
                1 Bag = <span className="text-lg">225</span> Pcs
              </div>
              <div className="bg-white border-2 border-emerald-200 p-3">
                <span className="block text-xs text-emerald-500 mb-1">BOTTLE (425ml)</span>
                1 Bag = <span className="text-lg">162 / 181</span> Pcs
              </div>
            </div>
          </div>



          <AdvancedInventorySection 
            sectionKey="BOTTLE" 
            title={`BOTTLE INVENTORY (${watchLine.includes("800") ? "800ml" : "425ml"})`} 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={watchLine.includes("800") ? MULTIPLIERS.BOTTLE_800 : MULTIPLIERS.BOTTLE_425}
            syncedDOs={syncedDOs.filter(d => d.category.includes("BOTTLE"))}
          />
          
          <AdvancedInventorySection 
            sectionKey="LABEL" 
            title={`LABEL INVENTORY (${watchLine.includes("800") ? "800ml" : "425ml"})`} 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={watchLine.includes("800") ? [6451] : [8547]}
            isLabel={true}
            syncedDOs={syncedDOs.filter(d => d.category.includes("LABEL"))}
          />

          <AdvancedInventorySection 
            sectionKey="CAP" 
            title="CAP INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={MULTIPLIERS.CAP}
            syncedDOs={syncedDOs.filter(d => d.category.includes("CAP"))}
          />

          {PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG].map(prod => {
            const isChecked = productionCheckboxes[prod.id as keyof typeof productionCheckboxes]?.checked
            if (!isChecked) return null;
            return (
              <AdvancedInventorySection 
                key={`BOX_${prod.id}`}
                sectionKey={`BOX_${prod.id}`} 
                title={`BOX INVENTORY (${prod.label})`} 
                control={control} register={register} watch={watch} setValue={setValue}
                availableCarryForward={availableCarryForward}
                multipliers={[1]} 
                syncedDOs={syncedDOs.filter(d => d.category.includes("BOX") && d.category.includes(prod.mult.toString()))}
              />
            )
          })}

          <AdvancedInventorySection 
            sectionKey="CARTON_CAP" 
            title="CARTON/BOX - CAP INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={[15]}
            syncedDOs={syncedDOs.filter(d => d.category === "CARTON/BOX - CAP")}
          />
          <AdvancedInventorySection 
            sectionKey="WRAPPING_HAND" 
            title="WRAPPING - HAND INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={[6]}
            syncedDOs={syncedDOs.filter(d => d.category === "WRAPPING - HAND")}
          />
          <AdvancedInventorySection 
            sectionKey="WRAPPING_MACHINE" 
            title="WRAPPING - MACHINE INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={[1]}
            syncedDOs={syncedDOs.filter(d => d.category === "WRAPPING - MACHINE")}
          />
          <AdvancedInventorySection 
            sectionKey="TAPE_OPP" 
            title="TAPE - OPP INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={[96]}
            syncedDOs={syncedDOs.filter(d => d.category === "TAPE - OPP")}
          />
          <AdvancedInventorySection 
            sectionKey="TAPE_MACHINE" 
            title="TAPE - MACHINE INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={[6]}
            syncedDOs={syncedDOs.filter(d => d.category === "TAPE - MACHINE")}
          />
          <AdvancedInventorySection 
            sectionKey="MACHINE_STRETCH_FILM" 
            title="MACHINE STRETCH FILM INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward}
            multipliers={[1]}
            syncedDOs={syncedDOs.filter(d => d.category === "MACHINE STRETCH FILM")}
          />

        </section>

        <section>
          <div className="flex items-center mb-6 border-b-[3px] border-black pb-2">
            <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">5</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Down Time / Technical Issues / Remarks</h2>
          </div>
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-black uppercase tracking-wider mb-2">Downtime by Section</label>
            {breakdownFields.map((field, index) => (
              <div key={field.id} className="flex flex-col md:flex-row gap-4 border-2 border-black p-4 bg-gray-50 relative">
                <button type="button" onClick={() => removeBreakdown(index)} className="md:hidden absolute top-2 right-2 text-red-500 hover:bg-red-50 p-2 border-2 border-red-100 rounded bg-red-50/50">
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="w-full md:w-[5%] flex items-center justify-center font-black text-xl">
                  {index + 1}.
                </div>
                <div className="w-full md:w-[25%]">
                  <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Section</label>
                  <select {...register(`breakdowns.${index}.section`)} className="w-full p-2 border-2 border-black bg-white font-bold outline-none focus:ring-2 focus:ring-black">
                    <option value="Section Sorting">Section Sorting</option>
                    <option value="Section Filling">Section Filling</option>
                  </select>
                </div>
                <div className="w-full md:w-[20%]">
                  <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Downtime (Minutes)</label>
                  <input type="number" {...register(`breakdowns.${index}.downtime`)} placeholder="Min" className="w-full p-2 border-2 border-black bg-white font-bold outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="w-full md:w-[45%]">
                  <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1">Reason</label>
                  <input type="text" {...register(`breakdowns.${index}.reason`)} placeholder="Reason for downtime" className="w-full p-2 border-2 border-black bg-white font-bold outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="hidden md:flex w-[5%] items-center justify-center">
                  <button type="button" onClick={() => removeBreakdown(index)} className="text-red-500 hover:text-red-700 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => appendBreakdown({ section: "Section Filling", downtime: "", reason: "" })} className="text-xs font-black uppercase tracking-wider flex items-center text-black border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
              <Plus className="h-4 w-4 mr-2" /> Add Downtime Record
            </button>
          </div>

          <div>
            <label className="block text-sm font-black uppercase tracking-wider mb-2">General Remarks</label>
            <textarea 
              {...register("remarks")} 
              rows={3} 
              placeholder="Additional remarks..."
              className="w-full border-[3px] border-black p-5 font-bold focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-2 bg-white resize-y text-lg"
            ></textarea>
          </div>
        </section>

        <section id="section-signature" className="mb-8">
          <div className="flex items-center mb-6 border-b-[3px] border-black pb-2">
            <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">6</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Digital Signature</h2>
          </div>
          <div className="bg-gray-50 border-[3px] border-black p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="font-black uppercase tracking-widest text-lg mb-2 flex items-center">
                <PenTool className="w-5 h-5 mr-2" /> Sign Here
              </h3>
              <p className="text-sm font-bold text-gray-500 mb-4">
                Please sign in the box below to verify that the information provided in this report is accurate and true to the best of your knowledge.
              </p>
              <p className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">
                * Signature is required to submit.
              </p>
            </div>
            <div className="w-full md:w-96 flex-shrink-0">
              <SignaturePadClient 
                onSave={(sig) => setValue("preparedSignature", sig || "")} 
                label="Prepared By Signature"
              />
            </div>
          </div>
        </section>

        <div className="pt-8 border-t-[3px] border-black flex justify-end">
          <button disabled={isSubmitting} type="submit" className="bg-black text-white px-12 py-5 font-black uppercase tracking-widest text-lg hover:bg-gray-800 transition-colors shadow-[6px_6px_0px_0px_rgba(100,100,100,1)] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] flex items-center disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-6 w-6 mr-3 animate-spin" /> : <Save className="h-6 w-6 mr-3" />} 
            Submit Daily Report
          </button>
        </div>
      </form>
    </div>
  )
}

// --- SUB COMPONENT FOR PRODUCTION BATCH DISTRIBUTION ---
function ProductionBatchDistribution({ prodId, label, isChecked, totalQty, control, register }: any) {
  const { fields, append, remove } = useFieldArray({ control, name: `production.${prodId}.batches` })
  const watchBatches = useWatch({ control, name: `production.${prodId}.batches` }) || []
  const sumOfDistributed = watchBatches.reduce((sum: number, batch: any) => sum + (Number(batch.qty) || 0), 0)
  const isMatch = sumOfDistributed === totalQty
  const isOver = sumOfDistributed > totalQty

  return (
    <div id={`field-production-${prodId}`} className={`border-[3px] border-black bg-white transition-all ${isChecked ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'opacity-60 bg-gray-50'}`}>
      <div className="p-4 border-b-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
        <label className="flex items-center font-black uppercase tracking-wider cursor-pointer text-lg">
          <input type="checkbox" {...register(`production.${prodId}.checked`)} className="w-6 h-6 mr-4 accent-black border-black border-2" />
          {label}
        </label>
        {isChecked && (
          <div className="flex items-center">
            <span className="font-bold mr-3 text-sm uppercase tracking-wider">Total Produced (Box):</span>
            <input type="number" min="0" {...register(`production.${prodId}.qty`)} className="w-32 border-2 border-black p-2 text-center font-bold outline-none bg-white text-lg" />
          </div>
        )}
      </div>
      {isChecked && (
        <div className="p-4 bg-gray-50/50 animate-in fade-in duration-300">
          <div className="mb-3 flex justify-between items-end">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Batch Distribution Breakdown</span>
            {totalQty > 0 && (
              <div className={`text-xs font-bold uppercase tracking-wider px-3 py-1 border-2 flex items-center ${isMatch ? 'bg-green-100 border-green-500 text-green-700' : isOver ? 'bg-red-100 border-red-500 text-red-700' : 'bg-yellow-100 border-yellow-500 text-yellow-700'}`}>
                {isMatch ? <CheckCircle2 className="w-3 h-3 mr-1.5" /> : <AlertTriangle className="w-3 h-3 mr-1.5" />}
                Distributed: {sumOfDistributed} / {totalQty} Box
              </div>
            )}
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <input type="text" placeholder="Batch Number" {...register(`production.${prodId}.batches.${index}.batchNo`)} className="w-full sm:w-48 border border-gray-300 p-2 font-bold uppercase text-sm outline-none focus:border-black" />
                <div className="flex items-center w-full sm:w-auto relative">
                  <input type="number" placeholder="Qty" min="0" {...register(`production.${prodId}.batches.${index}.qty`)} className="w-full sm:w-28 border border-gray-300 p-2 font-bold outline-none text-center text-sm focus:border-black" />
                  <select {...register(`production.${prodId}.batches.${index}.type`)} className="w-full sm:w-32 border-y border-r border-gray-300 p-2 font-bold outline-none bg-white text-sm focus:border-black">
                    <option value="Standard Front">Standard Front</option>
                    <option value="Standard Back">Standard Back</option>
                    <option value="Omega">Omega</option>
                    {(!prodId.includes('800')) && <option value="Felcra">Felcra</option>}
                    {(!prodId.includes('800')) && <option value="Ets">Ets</option>}
                    <option value="Brunei Front">Brunei Front</option>
                    <option value="Brunei Back">Brunei Back</option>
                    {(!prodId.includes('800')) && <option value="Prolintas">Prolintas</option>}
                    <option value="JHEAINS">JHEAINS</option>
                    {(!prodId.includes('800')) && <option value="Casuarina">Casuarina</option>}
                    <option value="MFL">MFL</option>
                    <option value="YNS">YNS</option>
                    <option value="KOWARIS">KOWARIS</option>
                    {(!prodId.includes('800')) && <option value="Richiamo">Richiamo</option>}
                    {(!prodId.includes('800')) && <option value="Al Falah">Al Falah</option>}
                    {(!prodId.includes('800')) && <option value="Mihas">Mihas</option>}
                    {(!prodId.includes('800')) && <option value="LTDI">LTDI</option>}
                    {(!prodId.includes('800')) && <option value="Yayasan Pahang">Yayasan Pahang</option>}
                    <option value="Others">Others...</option>
                  </select>
                  {watchBatches[index]?.type === "Others" && (
                    <input type="text" placeholder="Specify..." {...register(`production.${prodId}.batches.${index}.otherType`)} className="w-full sm:w-32 border border-blue-400 bg-blue-50 p-2 font-bold text-sm ml-2 outline-none focus:border-blue-600" />
                  )}
                </div>
                <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => append({ batchNo: "", qty: 0, type: "Standard Front", otherType: "" })} className="mt-4 text-xs font-black uppercase tracking-wider flex items-center text-indigo-700 border-2 border-indigo-200 px-3 py-1.5 bg-white hover:bg-indigo-50">
            <Plus className="h-3 w-3 mr-1" /> Add Batch Row
          </button>
        </div>
      )}
    </div>
  )
}

// --- SUB COMPONENT FOR ADVANCED INVENTORY SECTION V4.0 (Bags Logic) ---
const AdvancedInventorySection = ({ title, sectionKey, control, register, setValue, watch, availableCarryForward = [], multipliers = [1], isLabel = false, syncedDOs = [] }: any) => {
  const isCap = sectionKey === "CAP";
  const isBox = sectionKey.startsWith("BOX");
  const unit = isLabel ? 'Rolls' : (isCap || isBox) ? 'Boxes' : 'Bags';
    const { fields: sourceFields, append: appendSource, remove: removeSource } = useFieldArray({ control, name: `inventory.${sectionKey}.sources` })
    const { fields: usageFields, append: appendUsage, remove: removeUsage } = useFieldArray({ control, name: `inventory.${sectionKey}.usages` })
    
    const watchSources = useWatch({ control, name: `inventory.${sectionKey}.sources` }) || []
    const watchUsages = useWatch({ control, name: `inventory.${sectionKey}.usages` }) || []

    // Filter available carry forward batches for this specific section
    const sectionAvailableBatches = availableCarryForward.filter((d: any) => {
      // Use category if available, otherwise fallback to multipliers
      if (d.category) {
        if (sectionKey === "BOTTLE" && d.category.includes("BOTTLE")) return true
        if (sectionKey === "CAP" && d.category.includes("CAP")) return true
        if (sectionKey === "LABEL" && d.category.includes("LABEL")) return true
        if (sectionKey.startsWith("BOX") && d.category.includes("BOX")) {
          // ensure the multiplier matches the box type if possible
          if (sectionKey.includes("12") && d.category.includes("12")) return true
          if (sectionKey.includes("20") && d.category.includes("20")) return true
          if (sectionKey.includes("24") && d.category.includes("24")) return true
          if (sectionKey.includes("6") && d.category.includes("6")) return true
          return true // Fallback
        }
      }
      // Fallback multiplier logic
      if (sectionKey === "BOTTLE") return d.mult === 225 || d.mult === 181 || d.mult === 162
      if (sectionKey === "CAP") return d.mult === 4000
      if (sectionKey === "LABEL") return d.mult === 1
      return false
    })

    const handleBatchSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedBatchNo = e.target.value
      // We must call the register onChange manually so RHF tracks the value
      
      if (!selectedBatchNo) {
        setValue(`inventory.${sectionKey}.sources.${index}.bags`, 0)
        return
      }
      
      const batchData = sectionAvailableBatches.find((b: any) => b.batchNo === selectedBatchNo)
      if (batchData) {
        setValue(`inventory.${sectionKey}.sources.${index}.batchNo`, batchData.batchNo)
        setValue(`inventory.${sectionKey}.sources.${index}.bags`, batchData.bags)
        setValue(`inventory.${sectionKey}.sources.${index}.mult`, sectionKey === "CAP" ? 4000 : batchData.mult)
        if (isLabel) setValue(`inventory.${sectionKey}.sources.${index}.labelType`, batchData.labelType || "Standard Front")
      }
    }

  const batchSummaries: Record<string, { totalBags: number, usedBags: number, carryFwdBags: number, mult: number }> = {}

  syncedDOs.forEach((mock: any) => {
    if (!batchSummaries[mock.batchNo]) {
      batchSummaries[mock.batchNo] = { totalBags: 0, usedBags: 0, carryFwdBags: 0, mult: isCap ? 4000 : (Number(mock.mult) || 1) }
    }
    batchSummaries[mock.batchNo].totalBags += Number(mock.bags) || 0
  })

  // 2. Sum up available bags per batch from manual Storeroom Sources
  watchSources.forEach((src: any) => {
    if (!src.batchNo) return;
    const bags = Number(src.bags) || 0
    const mult = isCap ? 4000 : (Number(src.mult) || 1)
    
    if (!batchSummaries[src.batchNo]) {
      batchSummaries[src.batchNo] = { totalBags: 0, usedBags: 0, carryFwdBags: 0, mult: mult }
    }
    batchSummaries[src.batchNo].totalBags += bags
  })

  // 3. Sum up used bags per batch from Usages
  watchUsages.forEach((usage: any) => {
    if (!usage.batchNo || !batchSummaries[usage.batchNo]) return;
    const rawUsage = Number(usage.bags) || 0;
    const isUsageCap = sectionKey === "CAP";
    if (isUsageCap) {
       const w = Number(usage.weight) || 0;
       const b = Number(usage.boxes) || 0;
       const net = w > 0 ? w - (b * 0.88) : 0;
       const pcs = net > 0 ? Math.round(net / 0.002125) : 0;
       const mult = batchSummaries[usage.batchNo].mult || 4000;
       // Convert pcs to equivalent 'bags' (boxes) to subtract from inventory
       batchSummaries[usage.batchNo].usedBags += pcs > 0 ? (pcs / mult) : 0;
    } else {
       batchSummaries[usage.batchNo].usedBags += rawUsage;
    }
  })

  // 4. Compute Carry Forward
  Object.keys(batchSummaries).forEach(batch => {
    batchSummaries[batch].carryFwdBags = batchSummaries[batch].totalBags - batchSummaries[batch].usedBags
  })

  return (
    <div className="mb-12 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="bg-gray-100 border-b-[3px] border-black p-4 font-black text-black uppercase tracking-widest text-xl flex items-center justify-between">
        <span>{title}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 divide-y-[3px] xl:divide-y-0 xl:divide-x-[3px] divide-black">
        
        {/* LEFT COLUMN: SOURCE & USAGE INPUTS */}
        <div className="flex flex-col">
          
          {/* STEP 1: TRANSFER IN (TODAY'S DOS) */}
          <div className="p-4 border-b-[3px] border-black bg-emerald-50/30">
            <h3 className="font-black uppercase tracking-wider text-sm mb-4 flex items-center text-emerald-900">
              <span className="bg-emerald-600 text-white px-2 py-0.5 mr-2">1</span> Transfer In (Received Today)
            </h3>
            {syncedDOs.length === 0 ? (
              <p className="text-xs font-bold text-gray-400 italic">No incoming deliveries for this section today.</p>
            ) : (
              <div className="space-y-2">
                {syncedDOs.map((doItem: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 border border-emerald-200">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">{doItem.doNumber}</span>
                      <span className="text-xs font-black uppercase">{doItem.batchNo}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 mr-3">{doItem.bags} {unit}</span>
                      <span className="text-gray-500">x {doItem.mult} = {doItem.bags * doItem.mult} Pcs</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 2: STOREROOM SOURCES */}
          <div className="p-4 border-b-[3px] border-black bg-white">
            <h3 className="font-black uppercase tracking-wider text-sm mb-4 flex items-center">
              <span className="bg-black text-white px-2 py-0.5 mr-2">2</span> Storeroom Balance (Carry Fwd / Manual)
            </h3>
            
            <div className="space-y-3">
              {sourceFields.map((field, index) => {
                const bags = Number(watchSources[index]?.bags) || 0
                const mult = Number(watchSources[index]?.mult) || 1
                const calculatedPcs = bags * mult

                return (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-2 border border-gray-300">
                    {isLabel && (
                      <select {...register(`inventory.${sectionKey}.sources.${index}.labelType`)} className="w-full sm:w-32 p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-black uppercase">
                        <option value="Standard Front">Standard Front</option>
                        <option value="Standard Back">Standard Back</option>
                        <option value="Omega">Omega</option>
                        {(!title?.includes('800')) && <option value="Felcra">Felcra</option>}
                        {(!title?.includes('800')) && <option value="Ets">Ets</option>}
                        <option value="Brunei Front">Brunei Front</option>
                        <option value="Brunei Back">Brunei Back</option>
                        {(!title?.includes('800')) && <option value="Prolintas">Prolintas</option>}
                        <option value="JHEAINS">JHEAINS</option>
                        {(!title?.includes('800')) && <option value="Casuarina">Casuarina</option>}
                        <option value="MFL">MFL</option>
                        <option value="YNS">YNS</option>
                        <option value="KOWARIS">KOWARIS</option>
                        {(!title?.includes('800')) && <option value="Richiamo">Richiamo</option>}
                        {(!title?.includes('800')) && <option value="Al Falah">Al Falah</option>}
                        {(!title?.includes('800')) && <option value="Mihas">Mihas</option>}
                        {(!title?.includes('800')) && <option value="LTDI">LTDI</option>}
                        {(!title?.includes('800')) && <option value="Yayasan Pahang">Yayasan Pahang</option>}
                        <option value="Others">Others</option>
                      </select>
                    )}

                    <div className="w-full sm:w-56">
                      <select 
                        {...register(`inventory.${sectionKey}.sources.${index}.batchNo`, {
                          onChange: (e: any) => handleBatchSelect(index, e)
                        })} 
                        className="w-full p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-black uppercase"
                      >
                        <option value="">-- SELECT CARRY FORWARD --</option>
                        {sectionAvailableBatches.map((b: any) => (
                          <option key={b.batchNo} value={b.batchNo}>
                            {b.batchNo} ({b.bags} {unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex-1 flex justify-end">
                      <div className="flex items-center space-x-1">
                        <input type="number" placeholder={unit} min="0" {...register(`inventory.${sectionKey}.sources.${index}.bags`)} className="w-16 p-2 border border-gray-300 text-center text-xs font-bold outline-none focus:border-black" />
                        <span className="text-xs font-bold text-gray-500">×</span>
                        {isCap ? (
      <div className="p-2 border border-gray-100 bg-gray-50 text-gray-400 text-xs font-bold text-center">-</div>
   ) : (
      <select {...register(`inventory.${sectionKey}.sources.${index}.mult`)} className="p-2 border border-gray-300 text-xs font-bold outline-none bg-white">
                          {multipliers.map((m: number) => <option key={m} value={m}>{m}</option>)}
                        </select>
   )}
                        <span className="text-xs font-black text-indigo-700 ml-2 w-16 text-right">{calculatedPcs} Pcs</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeSource(index)} className="text-red-500 p-2 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )
              })}
            </div>
            <button type="button" onClick={() => appendSource({ batchNo: "", bags: 0, mult: sectionKey === "CAP" ? 4000 : multipliers[0], ...(isLabel && {labelType: "Standard Front"}) })} className="mt-4 text-xs font-black uppercase tracking-wider flex items-center border-2 border-black px-3 py-1.5 hover:bg-gray-100">
              <Plus className="h-3 w-3 mr-1" /> Add Storeroom Batch
            </button>
          </div>

          {/* STEP 3: USAGE LOG (IN BAGS) */}
          <div className="p-4 bg-blue-50/30 flex-1">
            <h3 className="font-black uppercase tracking-wider text-sm mb-4 flex items-center text-blue-900">
              <span className="bg-blue-900 text-white px-2 py-0.5 mr-2">3</span> Usage Log (By {unit.slice(0, -1)})
            </h3>
            
            <div className="space-y-3">
              {usageFields.map((field, index) => {
                const selectedBatch = watchUsages[index]?.batchNo
                const usageBags = Number(watchUsages[index]?.bags) || 0
                
                // Dropdown logic using BAGS instead of pcs
                const availableBatches = Object.keys(batchSummaries).filter(b => {
                  if (b === selectedBatch) return true; 
                  return batchSummaries[b].carryFwdBags > 0; 
                })

                return (
                  <div key={field.id} className="flex flex-wrap 2xl:flex-nowrap gap-2 items-center bg-white p-2 border border-blue-200 shadow-sm">
                    <select {...register(`inventory.${sectionKey}.usages.${index}.period`)} className="w-28 p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-blue-500">
                      <option value="Before">Before</option>
                      <option value="After">After</option>
                    </select>

                    <select {...register(`inventory.${sectionKey}.usages.${index}.batchNo`)} className="flex-1 p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-blue-500 uppercase">
                      <option value="">-- Select Batch --</option>
                      {availableBatches.map(b => {
                        const currentAvail = batchSummaries[b].carryFwdBags + (b === selectedBatch ? usageBags : 0)
                        return <option key={b} value={b}>{b} (Avail: {currentAvail} {unit})</option>
                      })}
                    </select>

                    
                    <div className="flex items-center w-full sm:w-auto sm:flex-1 mt-2 sm:mt-0">
                      {isCap ? (
                        <div className="flex gap-2 items-center flex-1 justify-between sm:justify-start">
                          <input type="number" placeholder="Boxes" min="0" {...register(`inventory.${sectionKey}.usages.${index}.boxes`)} className="w-16 p-2 border border-blue-300 text-center text-xs font-bold outline-none focus:border-blue-600 bg-blue-50" />
                          <input type="number" step="0.01" placeholder="Gross Wt (kg)" min="0" {...register(`inventory.${sectionKey}.usages.${index}.weight`)} className="w-24 p-2 border border-blue-300 text-center text-xs font-bold outline-none focus:border-blue-600 bg-blue-50" />
                          <span className="text-[10px] font-black text-indigo-700 whitespace-nowrap ml-1">
                            {(()=>{
                               const w = Number(watchUsages[index]?.weight)||0;
                               const b = Number(watchUsages[index]?.boxes)||0;
                               const net = w > 0 ? w - (b*0.88) : 0;
                               const pcs = net > 0 ? Math.round(net/0.002125) : 0;
                               return `= ${pcs} Pcs`;
                            })()}
                          </span>
                        </div>
                      ) : (
                        <input type="number" placeholder={`Used (${unit})`} min="0" {...register(`inventory.${sectionKey}.usages.${index}.bags`)} className="w-28 p-2 border border-blue-300 text-center text-xs font-bold outline-none focus:border-blue-600 bg-blue-50" />
                      )}
                    </div>
                    
                    
                    <button type="button" onClick={() => removeUsage(index)} className="text-red-500 p-2 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )
              })}
            </div>
            
            <button type="button" onClick={() => appendUsage({ period: "Before", batchNo: "", bags: 0, boxes: 0, weight: 0 })} className="mt-4 text-xs font-black uppercase tracking-wider flex items-center text-blue-700 border-2 border-blue-300 px-3 py-1.5 bg-white hover:bg-blue-100">
              <Plus className="h-3 w-3 mr-1" /> Log Usage
            </button>
            {isCap && (
              <div className="mt-4 text-[10px] font-bold text-blue-800 bg-blue-100 p-2 border border-blue-200">
                *Formula Cap: Net Weight = Gross Weight - (Boxes × 0.88kg). 1 Cap ≈ 2.125g.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SUMMARY CARRY FORWARD */}
        <div className="p-4 bg-yellow-50/50">
          <h3 className="font-black uppercase tracking-wider text-sm mb-4 flex items-center text-yellow-900">
            <span className="bg-yellow-900 text-white px-2 py-0.5 mr-2">4</span> Summary Carry Forward
          </h3>
          
          <table className="w-full text-sm text-black border-collapse bg-white border border-gray-300">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="p-2 text-left border-r border-gray-300 uppercase font-black text-xs">Batch No</th>
                <th className="p-2 text-center border-r border-gray-300 uppercase font-black text-xs w-16">Avail</th>
                <th className="p-2 text-center border-r border-gray-300 uppercase font-black text-xs w-16">Used</th>
                <th className="p-2 text-center uppercase font-black text-xs bg-yellow-100 w-24">Carry Fwd</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(batchSummaries).length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500 font-medium text-xs">No batches defined yet.</td></tr>
              ) : (
                Object.entries(batchSummaries).map(([batch, data]) => (
                  <tr key={batch} className="border-b border-gray-200 font-bold">
                    <td className="p-2 border-r border-gray-300 uppercase truncate max-w-[120px]" title={batch}>{batch}</td>
                    <td className="p-2 text-center border-r border-gray-300 text-gray-600">{Math.round(data.totalBags)} <span className="text-[10px]">B</span></td>
                    <td className="p-2 text-center border-r border-gray-300 text-blue-600">{Math.round(data.usedBags)} <span className="text-[10px]">B</span></td>
                    <td className={`p-2 border-l-[3px] border-black flex flex-col items-center justify-center font-black ${data.carryFwdBags < 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-50 text-yellow-900'}`}>
                      <span className="text-lg">{Math.round(data.carryFwdBags)} {unit}</span>
                      <span className="text-xs text-gray-500 font-bold">= {Math.round(data.carryFwdBags * data.mult)} Pcs</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
