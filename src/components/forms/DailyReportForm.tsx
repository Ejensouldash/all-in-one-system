"use client"

import { useForm, useFieldArray, useWatch, Control, UseFormRegister } from "react-hook-form"
import { Plus, Trash2, Save, ArrowLeft, Info, AlertTriangle, CheckCircle2, CloudDownload, Loader2, History, PenTool } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
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
  const { register, control, handleSubmit, watch, setValue, reset, getValues } = useForm({
    defaultValues: initialData ? {
      ...initialData,
      timeFrom: initialData.timeFrom || (initialData.time?.includes(' - ') ? initialData.time.split(' - ')[0] : initialData.time || ""),
      timeTo: initialData.timeTo || (initialData.time?.includes(' - ') ? initialData.time.split(' - ')[1] : "")
    } : {
      date: new Date().toISOString().split('T')[0],
      timeFrom: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      timeTo: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      reportTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      shift: "AM",
      line: "LINE 1 - 800ml" as keyof typeof PRODUCTION_CONFIG,
      preparedBy: userName || "",
      preparedSignature: "",
      verifiedBy: "",
      
      production: {
        p800_12: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
        p800_20: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
        p425_24: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
        p425_6:  { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
      },

      totalManpower: "",
      maxTotalManpower: "",
      rejectsScrap: { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} },
      rejectsReturn: { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} },
      breakdowns: [{ section: "autoscrambler", downtime: "", reason: "" }],
      noRejects: false,
      noProduction: false,

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
  const watchNoProduction = watch("noProduction")
  const productionCheckboxes = watch("production")
  const watchRejectsScrap = useWatch({ control, name: "rejectsScrap" });
  const watchRejectsReturn = useWatch({ control, name: "rejectsReturn" });
  const { fields: breakdownFields, append: appendBreakdown, remove: removeBreakdown } = useFieldArray({ control, name: "breakdowns" });
  const watchNoRejects = watch("noRejects")
  const watchInventory = watch("inventory")

  const [syncedDOs, setSyncedDOs] = useState<any[]>(initialData?.syncedDOs || [])
  const [allTodayDOs, setAllTodayDOs] = useState<any[]>([])
  const [availableCarryForward, setAvailableCarryForward] = useState<any[]>([])
  const [isFetchingSync, setIsFetchingSync] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isDraftLoaded, setIsDraftLoaded] = useState(false)

  // Draft Auto-save Logic
  useEffect(() => {
    if (!initialData && !reportId) {
      const draft = localStorage.getItem("dailyReportDraft")
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
          if (parsed && typeof parsed === 'object') {
            reset(parsed)
            if (parsed.syncedDOs) setSyncedDOs(parsed.syncedDOs)
          }
        } catch (e) {
          console.error("Failed to parse draft", e)
        }
      }
    }
    // Give reset time to propagate before enabling draft saving
    setTimeout(() => setIsDraftLoaded(true), 500)
  }, [initialData, reportId, reset])

  useEffect(() => {
    const handleRemoveDO = (e: any) => {
      const doId = e.detail;
      setSyncedDOs(prev => prev.filter((d: any) => d.id !== doId));
    };
    const handleAddDO = (e: any) => {
      const newDO = e.detail;
      setSyncedDOs(prev => {
        if (prev.some(d => d.id === newDO.id)) return prev;
        return [...prev, newDO];
      });
    };
    window.addEventListener('removeSyncedDO', handleRemoveDO);
    window.addEventListener('addSyncedDO', handleAddDO);
    return () => {
      window.removeEventListener('removeSyncedDO', handleRemoveDO);
      window.removeEventListener('addSyncedDO', handleAddDO);
    };
  }, []);

  const formValues = watch()
  useEffect(() => {
    if (!initialData && !reportId && !isSubmitting && isDraftLoaded) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem("dailyReportDraft", JSON.stringify({ ...formValues, syncedDOs }))
        } catch (e) {
          console.warn("Could not save draft (storage full or blocked)")
        }
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [formValues, syncedDOs, initialData, reportId, isSubmitting, isDraftLoaded])

  const watchDate = watch("date")
  const watchShift = watch("shift")

  const isInitialMount = useRef(true)

  // Fetch Global Inventory on mount and when date changes
  useEffect(() => {
    async function fetchInventory() {
      setIsFetchingSync(true)
      const res = await getActiveInventory(watchDate, reportId, watchShift)
      
      if (res.success) {
        setAllTodayDOs(res.data.todayDOs)
        
        if (isInitialMount.current && ((initialData?.syncedDOs !== undefined) || (localStorage.getItem("dailyReportDraft") && JSON.parse(localStorage.getItem("dailyReportDraft")!).syncedDOs))) {
          // Do not overwrite syncedDOs if we just loaded them from draft or edit
        } else {
          setSyncedDOs(res.data.todayDOs)
        }
        
        setAvailableCarryForward(res.data.storeroomBatches)
      }
      setIsFetchingSync(false)
      isInitialMount.current = false;
    }
    if (watchDate) {
      fetchInventory()
    }
  }, [watchDate, watchShift, reportId])

  // Auto-populate / disable fields when noProduction is checked
  useEffect(() => {
    if (watchNoProduction) {
      // Uncheck all production lines for current config
      const config = PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG] || []
      config.forEach(prod => {
        setValue(`production.${prod.id}.checked`, false)
        setValue(`production.${prod.id}.qty`, 0)
        setValue(`production.${prod.id}.batches`, [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }])
      })
      
      // Auto-set rejects to Tiada Rejects
      setValue("noRejects", true)
      
      // Clear rejects data
      const items = ["cap", "bottle", "label", "box"]
      items.forEach(k => {
        setValue(`rejectsScrap.${k}.before`, 0)
        setValue(`rejectsScrap.${k}.after`, 0)
        setValue(`rejectsReturn.${k}.before`, 0)
        setValue(`rejectsReturn.${k}.after`, 0)
      })

      // Auto-populate availableCarryForward to inventory.sources and clear usages/holds
      const updatedInventory = { ...getValues("inventory") }
      Object.keys(updatedInventory).forEach(sectionKey => {
        const sectionAvailableBatches = availableCarryForward.filter((d: any) => {
          if (d.category) {
            if (sectionKey === "BOTTLE" && d.category.includes("BOTTLE")) return true
            if (sectionKey === "CAP" && d.category.includes("CAP")) return true
            if (sectionKey === "LABEL" && d.category.includes("LABEL")) return true
            if (sectionKey.startsWith("BOX_")) {
              const size = sectionKey.replace("BOX_p", "").split("_")[0];
              const pack = sectionKey.split("_")[2];
              if (d.category.includes(size) && d.category.includes(pack)) return true
              return false
            }
          }
          if (sectionKey === "BOTTLE") return d.mult === 225 || d.mult === 181 || d.mult === 162
          if (sectionKey === "CAP") return d.mult === 4000
          if (sectionKey === "LABEL") return d.mult === 1
          return false
        })

        // Map them
        if (sectionAvailableBatches.length > 0) {
          updatedInventory[sectionKey].sources = sectionAvailableBatches.map((b: any) => ({
            batchNo: `${b.batchNo}|${b.mult}`,
            bags: b.bags,
            mult: b.mult,
            labelType: b.labelType || "Standard Front"
          }))
        } else {
          updatedInventory[sectionKey].sources = [{ batchNo: "", bags: 0, mult: 1 }]
        }
        updatedInventory[sectionKey].usages = [{ period: "Before", batchNo: "", bags: 0 }]
        updatedInventory[sectionKey].holds = []
      })
      setValue("inventory", updatedInventory)
    }
  }, [watchNoProduction, watchLine, availableCarryForward, setValue, getValues])

  const showErrorAndScroll = (elementId: string, message: string) => {
    alert(message)
    const el = document.getElementById(elementId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = el.querySelector('input, select, textarea') as HTMLElement
      if (input) input.focus()
    }
  }

  const prepareReportPayload = (data: any, isDraft = false) => {
    const formattedData = JSON.parse(JSON.stringify(data));
    formattedData.time = `${data.timeFrom || ""} - ${data.timeTo || ""}`;
    formattedData.syncedDOs = syncedDOs;
    if (isDraft) formattedData.isDraft = true;

    if (formattedData.noRejects) {
      formattedData.rejectsScrap = { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} };
      formattedData.rejectsReturn = { cap: {before:0,after:0}, bottle: {before:0,after:0}, label: {before:0,after:0}, box: {before:0,after:0} };
    }

    Object.keys(formattedData.inventory || {}).forEach(sectionKey => {
      let lowerItem = sectionKey === "CAP" ? "cap" : sectionKey === "BOTTLE" ? "bottle" : sectionKey === "LABEL" ? "label" : "box";
      if (sectionKey.startsWith("BOX_")) lowerItem = sectionKey.toLowerCase();
      
      if (formattedData.inventory[sectionKey].usages) {
        formattedData.inventory[sectionKey].usages = formattedData.inventory[sectionKey].usages.map((u: any) => {
          if (u.hasReject && Number(u.rejectQty) > 0) {
            const qty = Number(u.rejectQty);
            if (u.rejectType === 'Scrap') {
              if (!formattedData.rejectsScrap[lowerItem]) formattedData.rejectsScrap[lowerItem] = { before: 0, after: 0 };
              formattedData.rejectsScrap[lowerItem].after = (Number(formattedData.rejectsScrap[lowerItem].after) || 0) + qty;
            } else if (u.rejectType === 'Return') {
              if (!formattedData.rejectsReturn[lowerItem]) formattedData.rejectsReturn[lowerItem] = { before: 0, after: 0 };
              formattedData.rejectsReturn[lowerItem].after = (Number(formattedData.rejectsReturn[lowerItem].after) || 0) + qty;
            }
          }
          
          let pureBatchNo = u.batchNo;
          let pureMult = Number(u.mult) || 1;
          if (typeof u.batchNo === 'string' && u.batchNo.includes('|')) {
            const parts = u.batchNo.split('|');
            pureBatchNo = parts[0];
            pureMult = Number(parts[1]);
          }

          if (sectionKey === "CAP") {
            const w = Number(u.weight) || 0;
            const b = Number(u.boxes) || 0;
            
            let pcs = 0;
            if (w > 0 && b > 0) {
              const net = w - (b * 0.88);
              pcs = net > 0 ? Math.round(net / 0.002125) : 0;
            } else if (w > 0 && b === 0) {
              pcs = Math.round(w / 0.002125);
            } else if (b > 0 && w === 0) {
              pcs = b * 4000;
            }
            
            return { ...u, bags: pcs > 0 ? (pcs / 4000) : (Number(u.bags) || 0), batchNo: pureBatchNo, mult: 4000 };
          }
          
          return { ...u, batchNo: pureBatchNo, mult: pureMult };
        });
      }

      if (formattedData.inventory[sectionKey].sources) {
        formattedData.inventory[sectionKey].sources = formattedData.inventory[sectionKey].sources.map((s: any) => {
          let pureBatchNo = s.batchNo;
          let pureMult = Number(s.mult) || 1;
          if (typeof s.batchNo === 'string' && s.batchNo.includes('|')) {
            const parts = s.batchNo.split('|');
            pureBatchNo = parts[0];
            pureMult = Number(parts[1]);
          }
          return { ...s, batchNo: pureBatchNo, mult: pureMult };
        });
      }

      if (formattedData.inventory[sectionKey].holds) {
        formattedData.inventory[sectionKey].holds = formattedData.inventory[sectionKey].holds.map((h: any) => {
          let pureBatchNo = h.batchNo;
          let pureMult = Number(h.mult) || 1;
          if (typeof h.batchNo === 'string' && h.batchNo.includes('|')) {
            const parts = h.batchNo.split('|');
            pureBatchNo = parts[0];
            pureMult = Number(parts[1]);
          }
          return { ...h, batchNo: pureBatchNo, mult: pureMult };
        });
      }
    });

    return formattedData;
  }

  const onSubmit = async (data: any) => {
    if (isSubmitting) return
    if (!data.date) return showErrorAndScroll('field-date', 'Please fill in the Production Date.')
    if (!data.timeFrom || !data.timeTo) return showErrorAndScroll('field-time', 'Please fill in both Production Time (From and To).')
    if (!data.reportTime) return showErrorAndScroll('field-reportTime', 'Please fill in the Report Time.')
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

    setIsSubmitting(true)
    const formattedData = prepareReportPayload(data, false);

    const result = reportId ? await updateDailyReport(reportId, formattedData) : await createDailyReport(formattedData)
    setIsSubmitting(false)

    if (result.success) {
      localStorage.removeItem("dailyReportDraft")
      alert("Success! Daily Report officially submitted to Supabase.")
      window.location.href = "/forms"
    } else {
      alert("Failed to submit: " + result.error)
    }
  }

  const handleSaveAsDraft = async () => {
    const data = getValues();
    if (!data.date) return showErrorAndScroll("Please select a Production Date.", "date")
    if (!data.shift) return showErrorAndScroll("Please select a Shift.", "shift")
    if (!data.line) return showErrorAndScroll("Please select a Line.", "line")

    setIsSubmitting(true)
    const formattedData = prepareReportPayload(data, true);

    const result = reportId ? await updateDailyReport(reportId, formattedData) : await createDailyReport(formattedData)
    setIsSubmitting(false)

    if (result.success) {
      localStorage.removeItem("dailyReportDraft")
      alert("Draft saved successfully!")
      window.location.href = "/forms"
    } else {
      alert("Failed to save draft: " + result.error)
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
          <div className="flex items-center gap-4 mb-6">
            <Link href="/forms" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Forms
            </Link>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveAsDraft}
              className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black bg-yellow-400 px-4 py-2 hover:bg-yellow-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" /> Save as Draft
            </button>
          </div>
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
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Production Time</label>
              <div className="flex items-center gap-2">
                <input type="time" {...register("timeFrom")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
                <span className="font-bold">TO</span>
                <input type="time" {...register("timeTo")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
              </div>
            </div>
            <div id="field-reportTime">
              <label className="block text-xs font-black uppercase tracking-wider mb-2">Report Time</label>
              <input type="time" {...register("reportTime")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
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
                <div className="px-4 py-3 bg-gray-100 border-l-2 border-black border-r-2 font-black flex items-center text-gray-800">
                  /
                </div>
                <input type="number" {...register("maxTotalManpower")} className="w-full p-3 font-bold focus:outline-none bg-gray-100 text-center" placeholder="Max" />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center mb-6 border-b-[3px] border-black pb-2 justify-between gap-4">
            <div className="flex items-center">
              <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">2</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">Production Output & Distribution</h2>
            </div>
            <label className="flex items-center cursor-pointer bg-white border-2 border-black p-1.5 px-3 pr-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all whitespace-normal break-words shrink-0">
              <input type="checkbox" {...register("noProduction")} className="w-5 h-5 accent-black border-2 border-black mr-2" />
              <span className="font-black uppercase tracking-widest text-xs text-black">No Production</span>
            </label>
          </div>
          {watchNoProduction ? (
            <div className="p-8 border-4 border-dashed border-gray-300 bg-gray-50 text-center rounded-lg">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-pulse" />
              <h3 className="text-lg font-black uppercase text-gray-600">No Production Run For This Shift</h3>
              <p className="text-xs text-gray-500 font-bold max-w-sm mx-auto mt-1">
                All production quantities are set to 0. Available stock balances will automatically carry forward to the next shift.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG]?.map(prod => renderProductionRow(prod.id, prod.label))}
            </div>
          )}
        </section>

        <section id="section-rejects">
          <div className="flex flex-col sm:flex-row sm:items-center mb-4 border-b-[3px] border-black pb-2 justify-between gap-4">
            <div className="flex items-center">
              <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">3</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">Reject Tracking</h2>
            </div>
          </div>
          
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50 border-2 border-red-200 p-4">
            <p className="text-sm font-black uppercase text-red-600 tracking-wider">
              * Please fill in the box for reject product (Wajib Isi)
            </p>
            <label className="flex items-center cursor-pointer bg-white border-2 border-black p-2 px-4 pr-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all whitespace-normal break-words shrink-0">
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

          <div className="grid grid-cols-1 gap-8">
            {/* Table 1: Scrap / Disposal */}
            <div>
              <h3 className="font-black uppercase tracking-widest mb-3 bg-red-600 text-white px-4 py-2 inline-block">REJECT</h3>
              <div className="overflow-x-auto w-full">
                <table className={`w-full min-w-[500px] border-[3px] border-black text-base transition-opacity ${watchNoRejects ? 'opacity-50 pointer-events-none' : ''}`}>
                  <thead className="bg-gray-100 border-b-[3px] border-black">
                  <tr>
                    <th className="p-2 text-left border-r-[3px] border-black uppercase tracking-wider font-black text-xs">Item</th>
                    <th className="p-2 text-center border-r-[3px] border-black uppercase tracking-wider font-black text-xs">Before</th>
                    <th className="p-2 text-center border-r-[3px] border-black uppercase tracking-wider font-black text-xs">After</th>
                    <th className="p-2 text-center bg-gray-200 uppercase tracking-wider font-black text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const baseItems = ['CAP', 'BOTTLE', 'LABEL'];
                    const activeBoxItems = (PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG] || []).map(prod => `BOX_${prod.id}`);
                    const itemsToRender = [...baseItems, ...activeBoxItems];
                    return itemsToRender.map((item) => {
                      const lowerItem = item.toLowerCase() as any;
                      const displayItem = item.startsWith('BOX_') 
                        ? `BOX (${(PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG] || []).find(p => `BOX_${p.id}` === item)?.label})` 
                        : item;
                      
                      const befManual = Number(watchRejectsScrap?.[lowerItem]?.before) || 0
                      const aftManual = Number(watchRejectsScrap?.[lowerItem]?.after) || 0
                      
                      const totalBef = befManual
                      const totalAft = aftManual

                      return (
                        <tr key={item} className="border-b-[3px] border-black last:border-0 font-medium">
                          <td className="p-2 border-r-[3px] border-black font-black uppercase tracking-widest text-xs">{displayItem}</td>
                          <td className="p-0 border-r-[3px] border-black bg-white relative">
                            <input type="number" {...register(`rejectsScrap.${lowerItem}.before`)} min="0" disabled={watchNoRejects} onFocus={(e) => e.target.select()} onWheel={(e) => (e.target as HTMLElement).blur()} className="w-full h-full text-center p-3 outline-none hover:bg-red-50 focus:bg-red-50 font-black text-red-600 text-sm" />
                          </td>
                          <td className="p-0 border-r-[3px] border-black bg-white relative">
                            <input type="number" {...register(`rejectsScrap.${lowerItem}.after`)} min="0" disabled={watchNoRejects} onFocus={(e) => e.target.select()} onWheel={(e) => (e.target as HTMLElement).blur()} className="w-full h-full text-center p-3 outline-none hover:bg-red-50 focus:bg-red-50 font-black text-red-600 text-sm" />
                          </td>
                          <td className="p-2 text-center bg-gray-100 font-black text-lg text-red-700">{totalBef + totalAft}</td>
                        </tr>
                      )
                    });
                  })()}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: INVENTORY TRACKING V4.0 */}
        <section>
          <div className="flex items-center mb-6 border-b-[3px] border-black pb-2">
            <span className="bg-black text-white px-3 py-1 font-black text-lg mr-3">4</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Inventory & Material Tracking</h2>
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
            availableCarryForward={availableCarryForward.filter(b => b.category.includes("BOTTLE") && b.category.includes(watchLine.includes("800") ? "800" : "425"))}
            multipliers={watchLine.includes("800") ? MULTIPLIERS.BOTTLE_800 : MULTIPLIERS.BOTTLE_425}
            syncedDOs={syncedDOs.filter(d => d.category.includes("BOTTLE") && d.category.includes(watchLine.includes("800") ? "800" : "425"))}
            availableDOsToSync={allTodayDOs.filter(d => d.category.includes("BOTTLE") && d.category.includes(watchLine.includes("800") ? "800" : "425"))}
          />
          
          <AdvancedInventorySection 
            sectionKey="LABEL" 
            title={`LABEL INVENTORY (${watchLine.includes("800") ? "800ml" : "425ml"})`} 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward.filter(b => b.category.includes("LABEL") && (watchLine.includes("800") ? b.batchNo.startsWith("8S") : b.batchNo.startsWith("4S")))}
            multipliers={watchLine.includes("800") ? [6451] : [8547]}
            isLabel={true}
            syncedDOs={syncedDOs.filter(d => d.category.includes("LABEL") && (watchLine.includes("800") ? d.batchNo.startsWith("8S") : d.batchNo.startsWith("4S")))}
            availableDOsToSync={allTodayDOs.filter(d => d.category.includes("LABEL") && (watchLine.includes("800") ? d.batchNo.startsWith("8S") : d.batchNo.startsWith("4S")))}
          />

          <AdvancedInventorySection 
            sectionKey="CAP" 
            title="CAP INVENTORY" 
            control={control} register={register} watch={watch} setValue={setValue}
            availableCarryForward={availableCarryForward.filter(b => b.category.includes("CAP") && !b.category.includes("CARTON"))}
            multipliers={MULTIPLIERS.CAP}
            syncedDOs={syncedDOs.filter(d => d.category.includes("CAP") && !d.category.includes("CARTON"))}
            availableDOsToSync={allTodayDOs.filter(d => d.category.includes("CAP") && !d.category.includes("CARTON"))}
          />

          {(PRODUCTION_CONFIG[watchLine as keyof typeof PRODUCTION_CONFIG] || []).map(prod => {
            const isChecked = productionCheckboxes[prod.id as keyof typeof productionCheckboxes]?.checked
            
            const size = prod.id.replace("p", "").split("_")[0];
            const pack = prod.id.split("_")[1];
            
            return (
              <AdvancedInventorySection 
                key={prod.id}
                sectionKey={`BOX_${prod.id}`} 
                title={`BOX INVENTORY (${prod.label})`} 
                control={control} register={register} watch={watch} setValue={setValue}
                availableCarryForward={availableCarryForward.filter(b => b.category.includes("BOX") && !b.category.includes("CARTON") && b.category.includes(size) && b.category.includes(pack))}
                multipliers={[1]} 
                syncedDOs={syncedDOs.filter(d => d.category.includes("BOX") && !d.category.includes("CARTON") && d.category.includes(size) && d.category.includes(pack))}
                availableDOsToSync={allTodayDOs.filter(d => d.category.includes("BOX") && !d.category.includes("CARTON") && d.category.includes(size) && d.category.includes(pack))}
              />
            )
          })}



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
                    <option value="autoscrambler">autoscrambler</option>
                    <option value="3 in 1">3 in 1</option>
                    <option value="rinsing 3 in 1">rinsing 3 in 1</option>
                    <option value="filling 3 in 1">filling 3 in 1</option>
                    <option value="capping 3 in 1">capping 3 in 1</option>
                    <option value="blower">blower</option>
                    <option value="buffer area">buffer area</option>
                    <option value="conveyor">conveyor</option>
                    <option value="label machine">label machine</option>
                    <option value="laser printer">laser printer</option>
                    <option value="sealer machine">sealer machine</option>
                    <option value="robotic arm">robotic arm</option>
                    <option value="others">others</option>
                  </select>
                  {watch(`breakdowns.${index}.section`) === "others" && (
                    <input type="text" {...register(`breakdowns.${index}.customSection`)} placeholder="Specify section" className="mt-2 w-full p-2 border-2 border-black bg-white font-bold outline-none focus:ring-2 focus:ring-black" />
                  )}
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
            <button type="button" onClick={() => appendBreakdown({ section: "autoscrambler", downtime: "", reason: "" })} className="text-xs font-black uppercase tracking-wider flex items-center text-black border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
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
                {(() => {
                  const reg = register(`production.${prodId}.batches.${index}.batchNo`);
                  return (
                    <input 
                      type="text" 
                      placeholder="xxxxxx-xx" 
                      maxLength={9}
                      {...reg} 
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 6) {
                          val = val.slice(0, 6) + '-' + val.slice(6, 8);
                        }
                        e.target.value = val;
                        reg.onChange(e);
                      }}
                      className="w-full sm:w-48 border border-gray-300 p-2 font-bold uppercase text-center text-sm outline-none focus:border-black" 
                    />
                  );
                })()}
                <div className="flex items-center w-full sm:w-auto relative">
                  <input type="number" placeholder="Qty" min="0" {...register(`production.${prodId}.batches.${index}.qty`)} className="w-full sm:w-28 border border-gray-300 p-2 font-bold outline-none text-center text-sm focus:border-black" />
                  <select {...register(`production.${prodId}.batches.${index}.type`)} className="w-full sm:w-32 border-y border-r border-gray-300 p-2 font-bold outline-none bg-white text-sm focus:border-black">
                    <option value="Standard">Standard</option>
                    <option value="Omega">Omega</option>
                    <option value="MFL">MFL</option>
                    {(!prodId.includes('800')) && <option value="Felcra">Felcra</option>}
                    {(!prodId.includes('800')) && <option value="Ets">Ets</option>}
                    <option value="Brunei">Brunei</option>
                    {(!prodId.includes('800')) && <option value="Prolintas">Prolintas</option>}
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
const AdvancedInventorySection = ({ title, sectionKey, control, register, setValue, watch, availableCarryForward = [], multipliers = [1], isLabel = false, syncedDOs = [], availableDOsToSync = undefined }: any) => {
  const isCap = sectionKey === "CAP";
  const isBox = sectionKey.startsWith("BOX");
  const unit = isLabel ? 'Rolls' : (isCap || isBox) ? 'Boxes' : 'Bags';
    const { fields: sourceFields, append: appendSource, remove: removeSource } = useFieldArray({ control, name: `inventory.${sectionKey}.sources` })
    const { fields: usageFields, append: appendUsage, remove: removeUsage } = useFieldArray({ control, name: `inventory.${sectionKey}.usages` })
    const { fields: holdFields, append: appendHold, remove: removeHold } = useFieldArray({ control, name: `inventory.${sectionKey}.holds` })
    
    const watchSources = useWatch({ control, name: `inventory.${sectionKey}.sources` }) || []
    const watchUsages = useWatch({ control, name: `inventory.${sectionKey}.usages` }) || []
    const watchHolds = useWatch({ control, name: `inventory.${sectionKey}.holds` }) || []

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
      const selectedBatchKey = e.target.value
      // We must call the register onChange manually so RHF tracks the value
      
      if (!selectedBatchKey) {
        setValue(`inventory.${sectionKey}.sources.${index}.bags`, 0)
        return
      }
      
      const batchData = sectionAvailableBatches.find((b: any) => `${b.batchNo}|${b.mult}` === selectedBatchKey)
      if (batchData) {
        setValue(`inventory.${sectionKey}.sources.${index}.batchNo`, `${batchData.batchNo}|${batchData.mult}`)
        setValue(`inventory.${sectionKey}.sources.${index}.bags`, batchData.bags)
        setValue(`inventory.${sectionKey}.sources.${index}.mult`, sectionKey === "CAP" ? 4000 : batchData.mult)
        if (isLabel) setValue(`inventory.${sectionKey}.sources.${index}.labelType`, batchData.labelType || "Standard Front")
      }
    }

  const batchSummaries: Record<string, { totalBags: number, usedBags: number, carryFwdBags: number, mult: number, pureBatchNo: string, holdBags: number }> = {}

  syncedDOs.forEach((mock: any) => {
    const key = `${mock.batchNo}|${mock.mult}`
    if (!batchSummaries[key]) {
      batchSummaries[key] = { totalBags: 0, usedBags: 0, carryFwdBags: 0, mult: isCap ? 4000 : (Number(mock.mult) || 1), pureBatchNo: mock.batchNo, holdBags: 0 }
    }
    batchSummaries[key].totalBags += Number(mock.bags) || 0
  })

  // 2. Sum up available bags per batch from manual Storeroom Sources
  watchSources.forEach((src: any) => {
    if (!src.batchNo) return;
    const bags = Number(src.bags) || 0
    const mult = isCap ? 4000 : (Number(src.mult) || 1)
    
    // src.batchNo is already in "batchNo|mult" format because of our handleBatchSelect
    if (!batchSummaries[src.batchNo]) {
      batchSummaries[src.batchNo] = { 
        totalBags: 0, usedBags: 0, carryFwdBags: 0, mult: mult, pureBatchNo: src.batchNo.split('|')[0], holdBags: 0 
      }
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
       
       let pcs = 0;
       if (w > 0 && b > 0) {
         const net = w - (b * 0.88);
         pcs = net > 0 ? Math.round(net / 0.002125) : 0;
       } else if (w > 0 && b === 0) {
         pcs = Math.round(w / 0.002125);
       } else if (b > 0 && w === 0) {
         pcs = b * 4000;
       }
       
       const mult = batchSummaries[usage.batchNo].mult || 4000;
       const bagQty = pcs > 0 ? (pcs / mult) : 0;
       if (usage.period === 'After') {
         batchSummaries[usage.batchNo].usedBags -= bagQty;
       } else {
         batchSummaries[usage.batchNo].usedBags += bagQty;
       }
    } else {
       if (usage.period === 'After') {
         batchSummaries[usage.batchNo].usedBags -= rawUsage;
       } else {
         batchSummaries[usage.batchNo].usedBags += rawUsage;
       }
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
                      <span className="text-gray-500 mr-2">x {doItem.mult} = {doItem.bags * doItem.mult} Pcs</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (window.confirm('Remove this Transfer In from syncing?')) {
                            const event = new CustomEvent('removeSyncedDO', { detail: doItem.id });
                            window.dispatchEvent(event);
                          }
                        }}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Remove from sync"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {availableDOsToSync && availableDOsToSync.length > 0 && (
              <div className="mt-4 pt-3 border-t border-emerald-200">
                <label className="text-[10px] font-black uppercase text-emerald-800 block mb-1">Select Transfer In to Add</label>
                <select 
                  className="w-full p-2 border border-emerald-300 bg-white text-xs font-bold outline-none focus:border-emerald-500 uppercase"
                  onChange={(e) => {
                    const doId = e.target.value;
                    if (!doId) return;
                    const selected = availableDOsToSync.find((d: any) => d.id === doId);
                    if (selected && !syncedDOs.some((d: any) => d.id === doId)) {
                      const event = new CustomEvent('addSyncedDO', { detail: selected });
                      window.dispatchEvent(event);
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">-- SELECT DO --</option>
                  {availableDOsToSync.filter((d: any) => !syncedDOs.some((s: any) => s.id === d.id)).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.doNumber} - {d.batchNo} ({d.bags} {unit})
                    </option>
                  ))}
                </select>
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
                  <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-3 px-4 border border-gray-300">
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
                        <option value="JHEAINS Front">JHEAINS Front</option>
                        <option value="JHEAINS Back">JHEAINS Back</option>
                        {(!title?.includes('800')) && <option value="Casuarina">Casuarina</option>}
                        <option value="MFL Front">MFL Front</option>
                        <option value="MFL Back">MFL Back</option>
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
                        value={watchSources[index]?.batchNo || ""}
                        {...register(`inventory.${sectionKey}.sources.${index}.batchNo`, {
                          onChange: (e: any) => handleBatchSelect(index, e)
                        })} 
                        className="w-full p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-black uppercase"
                      >
                        <option value="">-- SELECT CARRY FORWARD --</option>
                        {watchSources[index]?.batchNo && !sectionAvailableBatches.some((b: any) => `${b.batchNo}|${b.mult}` === watchSources[index].batchNo) && (
                          <option value={watchSources[index].batchNo}>
                            {watchSources[index].batchNo.split('|')[0]} (x{watchSources[index].batchNo.split('|')[1]})
                          </option>
                        )}
                        {sectionAvailableBatches.map((b: any) => (
                          <option key={`${b.batchNo}|${b.mult}`} value={`${b.batchNo}|${b.mult}`}>
                            {b.batchNo} (x{b.mult}) ({b.bags} {unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex-1 flex justify-end w-full sm:w-auto">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <input type="number" placeholder={unit} min="0" {...register(`inventory.${sectionKey}.sources.${index}.bags`)} className="w-16 p-2 border border-gray-300 text-center text-xs font-bold outline-none focus:border-black" />
                        <span className="text-xs font-bold text-gray-500">×</span>
                        {isCap ? (
      <div className="p-2 border border-gray-100 bg-gray-50 text-gray-400 text-xs font-bold text-center">-</div>
   ) : (
      <select {...register(`inventory.${sectionKey}.sources.${index}.mult`)} className="p-2 border border-gray-300 text-xs font-bold outline-none bg-white">
                          {multipliers.map((m: number) => <option key={m} value={m}>{m}</option>)}
                        </select>
   )}
                        <span className="text-xs font-black text-indigo-700 ml-2 min-w-[4.5rem] text-right">{calculatedPcs} {isLabel ? 'Rolls' : 'Pcs'}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeSource(index)} className="text-red-500 p-2 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )
              })}
            </div>
            {watchSources.length > 0 && (
              <div className="mt-2 flex justify-end w-full">
                <div className="bg-emerald-100 p-3 sm:px-4 sm:py-2 border-2 border-emerald-200 font-black text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-gray-600 uppercase tracking-widest text-xs">Total Storeroom</span>
                  {isLabel ? (
                    <div className="flex flex-col text-xs space-y-1">
                      {Object.entries(
                        watchSources.reduce((acc: any, s: any) => {
                          const type = s.labelType || "Unknown";
                          const bags = Number(s.bags) || 0;
                          if (bags > 0) acc[type] = (acc[type] || 0) + bags;
                          return acc;
                        }, {})
                      ).map(([type, bags]: any) => (
                        <div key={type} className="flex justify-between min-w-[200px]">
                          <span className="text-gray-700">{type.toUpperCase()}</span>
                          <span className="text-black">{bags} {unit}</span>
                        </div>
                      ))}
                      <div className="border-t border-emerald-300 pt-1 mt-1 flex justify-between min-w-[200px] text-sm">
                        <span className="text-gray-600">OVERALL</span>
                        <span className="text-lg">{watchSources.reduce((acc: number, s: any) => acc + (Number(s?.bags)||0), 0)} {unit}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-lg">{watchSources.reduce((acc: number, s: any) => acc + (Number(s?.bags)||0), 0)} {unit}</span>
                      <span className="text-emerald-700">({watchSources.reduce((acc: number, s: any) => acc + ((Number(s?.bags)||0) * (Number(s?.mult)||1)), 0)} Pcs)</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <button type="button" onClick={() => appendSource({ batchNo: "", bags: 0, mult: sectionKey === "CAP" ? 4000 : multipliers[0], ...(isLabel && {labelType: "Standard Front"}) })} className="mt-4 text-xs font-black uppercase tracking-wider flex items-center border-2 border-black px-3 py-1.5 hover:bg-gray-100">
              <Plus className="h-3 w-3 mr-1" /> Add Storeroom Batch
            </button>
          </div>

          {/* STEP 3: USAGE LOG (IN BAGS) */}
          <div className="p-4 bg-blue-50/30 flex-1">
            <h3 className="font-black uppercase tracking-wider text-sm mb-4 flex items-center text-blue-900">
              <span className="bg-blue-900 text-white px-2 py-0.5 mr-2">3</span> Usage Log (By {unit === 'Boxes' ? 'Box' : unit.slice(0, -1)})
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
                  <div key={field.id} className="flex flex-col bg-white border border-blue-200 shadow-sm">
                    <div className="flex flex-wrap gap-2 items-center p-3 px-4">
                      <select {...register(`inventory.${sectionKey}.usages.${index}.period`)} className="w-28 p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-blue-500">
                        <option value="Before">Before</option>
                        <option value="After">After</option>
                      </select>

                      {isLabel && (
                        <select
                          {...register(`inventory.${sectionKey}.usages.${index}.labelType`)}
                          className="w-32 p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-blue-500 uppercase"
                        >
                          <option value="Standard Front">Standard Front</option>
                          <option value="Standard Back">Standard Back</option>
                          <option value="Brunei Front">Brunei Front</option>
                          <option value="Brunei Back">Brunei Back</option>
                          <option value="Sabah Front">Sabah Front</option>
                          <option value="Sabah Back">Sabah Back</option>
                          <option value="JHEAINS Front">JHEAINS Front</option>
                          <option value="JHEAINS Back">JHEAINS Back</option>
                          {(!title?.includes('800')) && <option value="Casuarina">Casuarina</option>}
                          <option value="MFL Front">MFL Front</option>
                          <option value="MFL Back">MFL Back</option>
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

                      <select 
                        value={watchUsages[index]?.batchNo || ""}
                        {...register(`inventory.${sectionKey}.usages.${index}.batchNo`)} 
                        className="flex-1 p-2 border border-gray-300 bg-white text-xs font-bold outline-none focus:border-blue-500 uppercase"
                      >
                        <option value="">-- Select Batch --</option>
                        {watchUsages[index]?.batchNo && !availableBatches.includes(watchUsages[index].batchNo) && (
                          <option value={watchUsages[index].batchNo}>
                            {watchUsages[index].batchNo.split('|')[0]} (x{watchUsages[index].batchNo.split('|')[1]})
                          </option>
                        )}
                        {availableBatches.map(b => {
                          const currentAvail = batchSummaries[b].carryFwdBags + (b === selectedBatch ? usageBags : 0)
                          return <option key={b} value={b}>{batchSummaries[b].pureBatchNo} (x{batchSummaries[b].mult}) (Avail: {Math.round(currentAvail)} {unit})</option>
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
                               let pcs = 0;
                               if (w > 0 && b > 0) {
                                 const net = w - (b*0.88);
                                 pcs = net > 0 ? Math.round(net/0.002125) : 0;
                               } else if (w > 0 && b === 0) {
                                 pcs = Math.round(w/0.002125);
                               } else if (b > 0 && w === 0) {
                                 pcs = b * 4000;
                               }
                               return `= ${pcs} Pcs`;
                            })()}
                          </span>
                        </div>
                      ) : (
                        <input type="number" placeholder={`Used (${unit})`} min="0" {...register(`inventory.${sectionKey}.usages.${index}.bags`)} className="w-28 p-2 border border-blue-300 text-center text-xs font-bold outline-none focus:border-blue-600 bg-blue-50" />
                      )}
                    </div>
                    
                    
                      <button type="button" onClick={() => removeUsage(index)} className="text-red-500 p-2 hover:bg-red-50 ml-auto"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
            {watchUsages.length > 0 && (
              <div className="mt-2 flex justify-end w-full">
                <div className="bg-blue-100 p-3 sm:px-4 sm:py-2 border-2 border-blue-200 font-black text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-gray-600 uppercase tracking-widest text-xs">Total Usage</span>
                  {isLabel ? (
                    <div className="flex flex-col text-xs space-y-1">
                      {Object.entries(
                        watchUsages.reduce((acc: any, u: any) => {
                          const type = u.labelType || "Unknown";
                          const bags = Number(u.bags) || 0;
                          if (bags > 0) acc[type] = (acc[type] || 0) + bags;
                          return acc;
                        }, {})
                      ).map(([type, bags]: any) => (
                        <div key={type} className="flex justify-between min-w-[200px]">
                          <span className="text-gray-700">{type.toUpperCase()}</span>
                          <span className="text-black">{bags} {unit}</span>
                        </div>
                      ))}
                      <div className="border-t border-blue-300 pt-1 mt-1 flex justify-between min-w-[200px] text-sm">
                        <span className="text-gray-600">OVERALL</span>
                        <span className="text-lg">{watchUsages.reduce((acc: number, u: any) => acc + (Number(u?.bags)||0), 0)} {unit}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-lg">{isCap ? watchUsages.reduce((acc: number, u: any) => acc + (Number(u?.boxes)||0), 0) : watchUsages.reduce((acc: number, u: any) => acc + (Number(u?.bags)||0), 0)} {unit}</span>
                      {isCap && (
                        <span className="text-blue-700">({watchUsages.reduce((acc: number, u: any) => {
                          const w = Number(u?.weight)||0;
                          const b = Number(u?.boxes)||0;
                          if (w > 0 && b > 0) return acc + Math.round((w - (b*0.88))/0.002125);
                          if (w > 0 && b === 0) return acc + Math.round(w/0.002125);
                          if (b > 0 && w === 0) return acc + (b * 4000);
                          return acc;
                        }, 0)} Pcs)</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            <button type="button" onClick={() => appendUsage({ period: "Before", batchNo: "", bags: 0, boxes: 0, weight: 0, ...(isLabel && {labelType: "Standard Front"}) })} className="mt-4 text-xs font-black uppercase tracking-wider flex items-center text-blue-700 border-2 border-blue-300 px-3 py-1.5 bg-white hover:bg-blue-100">
              <Plus className="h-3 w-3 mr-1" /> Log Usage
            </button>
            {isCap && (
              <div className="mt-4 text-[10px] font-bold text-blue-800 bg-blue-100 p-2 border border-blue-200">
                *Formula Cap: Net Weight = Gross Weight - (Boxes × 0.88kg). 1 Cap ≈ 2.125g.
              </div>
            )}
            
            {/* STEP 3B: HOLD SECTION */}
            <div className="mt-6 border-t-[3px] border-blue-200 pt-4">
              <h4 className="font-black uppercase tracking-widest text-xs mb-3 text-amber-600 flex items-center">
                <span className="bg-amber-600 text-white px-2 py-0.5 mr-2">HOLD</span> Quarantine / On Hold
              </h4>
              
              <div className="space-y-3">
                {holdFields.map((field, index) => {
                  const selectedBatch = watchHolds[index]?.batchNo
                  const holdBags = Number(watchHolds[index]?.qty) || 0
                  
                  const availableBatches = Object.keys(batchSummaries).filter(b => {
                    if (b === selectedBatch) return true; 
                    return batchSummaries[b].carryFwdBags > 0; 
                  })

                  return (
                    <div key={field.id} className="flex flex-col bg-amber-50/50 border border-amber-200 shadow-sm p-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <select 
                          value={watchHolds[index]?.batchNo || ""}
                          {...register(`inventory.${sectionKey}.holds.${index}.batchNo`)} 
                          className="flex-1 min-w-[150px] p-2 border border-amber-300 bg-white text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        >
                          <option value="">-- Select Batch --</option>
                          {watchHolds[index]?.batchNo && !availableBatches.includes(watchHolds[index].batchNo) && (
                            <option value={watchHolds[index].batchNo}>
                              {watchHolds[index].batchNo.split('|')[0]} (x{watchHolds[index].batchNo.split('|')[1]}) (Saved)
                            </option>
                          )}
                          {availableBatches.map(b => {
                            const currentAvail = batchSummaries[b].carryFwdBags + (b === selectedBatch ? holdBags : 0)
                            return <option key={b} value={b}>{batchSummaries[b].pureBatchNo} (x{batchSummaries[b].mult}) (Avail: {Math.round(currentAvail)} {unit})</option>
                          })}
                        </select>
                        <input type="number" placeholder={`Hold Qty (${unit})`} min="0" {...register(`inventory.${sectionKey}.holds.${index}.qty`)} className="w-28 p-2 border border-amber-300 text-center text-xs font-bold outline-none focus:border-amber-500 bg-white" />
                        
                        {/* Hidden multiplier input */}
                        <input type="hidden" {...register(`inventory.${sectionKey}.holds.${index}.mult`)} value={isCap ? 4000 : multipliers[0]} />

                        <input type="text" placeholder="Reason for holding..." {...register(`inventory.${sectionKey}.holds.${index}.reason`)} className="flex-[2] min-w-[200px] p-2 border border-amber-300 text-xs font-bold outline-none focus:border-amber-500 bg-white" />
                        
                        <button type="button" onClick={() => removeHold(index)} className="text-red-500 p-2 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <button type="button" onClick={() => appendHold({ batchNo: "", qty: 0, mult: isCap ? 4000 : multipliers[0], reason: "" })} className="mt-4 text-xs font-black uppercase tracking-wider flex items-center text-amber-700 border-2 border-amber-300 px-3 py-1.5 bg-white hover:bg-amber-100">
                <Plus className="h-3 w-3 mr-1" /> Add Hold
              </button>
            </div>
            
            {/* INLINE REJECT INPUT */}
            <div className={`mt-6 border-t-[3px] border-blue-200 pt-4 ${watch('noRejects') ? 'opacity-50 pointer-events-none' : ''}`}>
              <h4 className="font-black uppercase tracking-widest text-xs mb-3 text-red-600 flex items-center">
                <span className="bg-red-600 text-white px-2 py-0.5 mr-2">REJECTS</span> Record Scrap / Disposal
              </h4>
              <div className="flex gap-4 items-center">
                <div className="flex-1 bg-white p-2 border border-red-200">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Before (Pcs)</label>
                  <input type="number" min="0" {...register(`rejectsScrap.${sectionKey.toLowerCase()}.before`)} disabled={watch('noRejects')} onFocus={(e) => e.target.select()} onWheel={(e) => (e.target as HTMLElement).blur()} className="w-full p-2 border border-red-300 text-center font-bold text-sm outline-none focus:border-red-600 focus:bg-red-50 text-red-700" />
                </div>
                <div className="flex-1 bg-white p-2 border border-red-200">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">After (Pcs)</label>
                  <input type="number" min="0" {...register(`rejectsScrap.${sectionKey.toLowerCase()}.after`)} disabled={watch('noRejects')} onFocus={(e) => e.target.select()} onWheel={(e) => (e.target as HTMLElement).blur()} className="w-full p-2 border border-red-300 text-center font-bold text-sm outline-none focus:border-red-600 focus:bg-red-50 text-red-700" />
                </div>
              </div>
            </div>
            
          </div>

        </div>

        {/* RIGHT COLUMN: SUMMARY CARRY FORWARD */}
        <div className="p-4 bg-yellow-50/50">
          <h3 className="font-black uppercase tracking-wider text-sm mb-4 flex items-center text-yellow-900">
            <span className="bg-yellow-900 text-white px-2 py-0.5 mr-2">4</span> Summary Carry Forward
          </h3>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[500px] text-sm text-black border-collapse bg-white border border-gray-300">
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
                    <td className="p-2 border-r border-gray-300 uppercase truncate max-w-[120px]" title={batch}>{data.pureBatchNo} (x{data.mult})</td>
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
    </div>
  )
}
