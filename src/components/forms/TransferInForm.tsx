"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { Plus, Trash2, Save, ArrowLeft, Truck, Loader2 } from "lucide-react"
import Link from "next/link"
import { createTransferIn } from "@/app/actions/transferIn"
import { useState } from "react"

const MULTIPLIERS = {
  BOTTLE_800: [225],
  BOTTLE_425: [181, 162],
  BOX: [1],
  CAP: [4000],
  LABEL: [1],
  CARTON_CAP: [15],
  WRAPPING_HAND: [6],
  WRAPPING_MACHINE: [1],
  TAPE_OPP: [96],
  TAPE_MACHINE: [6],
  MACHINE_STRETCH_FILM: [1]
}

export function TransferInForm({ userName, initialData }: { userName: string, initialData?: any }) {
  const isEditing = !!initialData;
  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: initialData ? {
      ...initialData,
      receiveDate: new Date(initialData.receiveDate).toISOString().split('T')[0],
      items: initialData.items.map((item: any) => ({
        ...item,
        weight: 0 // Optional: reset weight since we only save bags and mult in DB
      }))
    } : {
      receiveDate: new Date().toISOString().split('T')[0],
      receiveTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      receiverName: userName || "",
      doNumber: "",
      
      items: [
        { category: "BOTTLE 800ml", batchNo: "", bags: 0, mult: 225, weight: 0 }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const watchItems = watch("items")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isBoxDO = watchItems.some((item: any) => (item.category || "").includes("BOX"))

  const showErrorAndScroll = (elementId: string, message: string) => {
    alert(message)
    const el = document.getElementById(elementId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = el.querySelector('input')
      if (input) input.focus()
    }
  }

  const onSubmit = async (data: any) => {
    if (!data.receiveDate) return showErrorAndScroll('field-receiveDate', 'Please fill in the Receive Date.')
    if (!data.receiveTime) return showErrorAndScroll('field-receiveTime', 'Please fill in the Receive Time.')
    if (!data.doNumber) return showErrorAndScroll('field-doNumber', 'Please fill in the DO Number.')
    if (!data.receiverName) return showErrorAndScroll('field-receiverName', 'Please fill in the Receiver (Staff) name.')
    
    if (!data.items || data.items.length === 0) {
      alert('Please add at least one incoming item.')
      return
    }
    
    for (let i = 0; i < data.items.length; i++) {
       const cat = data.items[i].category || "";
       if (!data.items[i].batchNo) {
          return showErrorAndScroll(`item-${i}-batchNo`, `Please fill in the Batch No for item #${i + 1}.`)
       }
       
       if (cat === "CAP") {
         const w = Number(data.items[i].weight) || 0;
         const b = Number(data.items[i].bags) || 0;
         if (w <= 0 && b <= 0) {
           return showErrorAndScroll(`item-${i}-bags`, `Please fill in either Total Boxes or Gross Weight for CAP item #${i + 1}.`)
         }
       } else {
         if (!data.items[i].bags || Number(data.items[i].bags) <= 0) {
            return showErrorAndScroll(`item-${i}-bags`, `Please fill in the Quantity (Bags/Box) for item #${i + 1}.`)
         }
       }
    }

    setIsSubmitting(true)
    
    const isBoxSubmission = data.items.some((item: any) => (item.category || "").includes("BOX"));
    let finalDoNumber = data.doNumber;
    if (isBoxSubmission) {
      const rawDo = data.doNumber.replace(/[^0-9]/g, '');
      finalDoNumber = rawDo ? `DO - ${rawDo}` : "";
    }
    
    const formattedData = {
      ...data,
      doNumber: finalDoNumber,
      items: data.items.map((item: any) => {
        const cat = item.category || "";
        if (cat === "CAP") {
          const w = Number(item.weight) || 0;
          const b = Number(item.bags) || 0;
          let pcs = 0;
          
          if (w > 0 && b > 0) {
            const netWeight = w - (b * 0.88);
            pcs = netWeight > 0 ? Math.round(netWeight / 0.002125) : 0;
          } else if (w > 0 && b === 0) {
            pcs = Math.round(w / 0.002125);
          } else if (b > 0 && w === 0) {
            pcs = b * 4000;
          }
          
          const saveBags = b > 0 ? b : 1;
          const mult = Math.round(pcs / saveBags);
          return { ...item, bags: saveBags, mult: mult };
        }
        return item;
      })
    }
    try {
      const { createTransferIn, updateTransferIn } = await import('@/app/actions/transferIn');
      let result;
      if (isEditing) {
        result = await updateTransferIn(initialData.id, formattedData);
      } else {
        result = await createTransferIn(formattedData);
      }
      
      if (result.success) {
        alert(isEditing ? 'Transfer In DO updated successfully!' : 'Transfer In DO saved successfully!')
        window.location.href = '/forms/production/transfer-in/history'
      } else {
        alert(`Failed to save: ${result.error}`)
        setIsSubmitting(false)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
      setIsSubmitting(false)
    }
  }

  // Calculate totals
  const totalBags = watchItems.reduce((sum: number, item: any) => sum + (Number(item.bags) || 0), 0)
  
  const totalPcs = watchItems.reduce((sum: number, item: any) => {
    const cat = item.category || ""
    if (cat.includes("LABEL")) return sum // exclude label from pcs
    
    if (cat === "CAP") {
      const w = Number(item.weight) || 0;
      const b = Number(item.bags) || 0;
      let pcs = 0;
      if (w > 0 && b > 0) {
        const netWeight = w - (b * 0.88);
        pcs = netWeight > 0 ? Math.round(netWeight / 0.002125) : 0;
      } else if (w > 0 && b === 0) {
        pcs = Math.round(w / 0.002125);
      } else if (b > 0 && w === 0) {
        pcs = b * 4000;
      }
      return sum + pcs;
    }
    
    return sum + ((Number(item.bags) || 0) * (Number(item.mult) || 1))
  }, 0)

  return (
    <div className="bg-white text-black min-h-screen font-sans border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
      
      <div className="border-b-[3px] border-black p-6 bg-emerald-50 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <Link href="/forms" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 mb-6 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Forms
          </Link>
          <div className="flex items-center">
            <Truck className="h-10 w-10 mr-4 text-emerald-700" />
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Delivery Order (Transfer In)</h1>
          </div>
          <p className="font-bold text-gray-600 uppercase tracking-widest text-sm mt-2 ml-14">Warehouse Module v1.0</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div id="field-receiveDate">
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Receive Date</label>
            <input type="date" {...register("receiveDate")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
          </div>
          <div id="field-receiveTime">
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Receive Time</label>
            <input type="time" {...register("receiveTime")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white" />
          </div>
          <div id="field-doNumber">
            <label className="block text-xs font-black uppercase tracking-wider mb-2">DO Number</label>
            <div className={`flex ${isBoxDO ? 'border-2 border-black bg-white focus-within:ring-2 focus-within:ring-black' : ''}`}>
              {isBoxDO && (
                <div className="px-3 py-3 bg-gray-100 border-r-2 border-black font-black flex items-center text-gray-800 whitespace-nowrap">
                  DO -
                </div>
              )}
              <input 
                type="text" 
                placeholder={isBoxDO ? "xxxx/xx/xxx" : "Enter DO Number"} 
                {...register("doNumber")} 
                onChange={(e) => {
                  let val = e.target.value;
                  if (isBoxDO) {
                    let raw = val.replace(/[^0-9]/g, '');
                    let formatted = raw;
                    if (raw.length > 4) {
                      formatted = raw.slice(0, 4) + '/' + raw.slice(4);
                    }
                    if (raw.length > 6) {
                      formatted = raw.slice(0, 4) + '/' + raw.slice(4, 6) + '/' + raw.slice(6, 9);
                    }
                    setValue("doNumber", formatted, { shouldValidate: true, shouldDirty: true });
                  } else {
                    setValue("doNumber", val.toUpperCase(), { shouldValidate: true, shouldDirty: true });
                  }
                }}
                maxLength={isBoxDO ? 11 : 50}
                className={`w-full p-3 font-bold focus:outline-none bg-white ${!isBoxDO ? 'border-2 border-black focus:ring-2 focus:ring-black uppercase' : ''}`} 
              />
            </div>
          </div>
          <div id="field-receiverName">
            <label className="block text-xs font-black uppercase tracking-wider mb-2">Receiver (Staff)</label>
            <input type="text" {...register("receiverName")} className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black bg-white uppercase" />
          </div>
        </div>

        <div className="border-[3px] border-black bg-white">
          <div className="bg-gray-100 border-b-[3px] border-black p-4 font-black uppercase tracking-widest text-lg">
            Incoming Items
          </div>
          
          <div className="flex flex-col">
            {/* Desktop Header */}
            <div className="hidden md:flex border-b-[3px] border-black bg-white">
              <div className="w-[20%] p-4 font-black uppercase text-xs text-gray-500">Category</div>
              <div className="w-[25%] p-4 font-black uppercase text-xs text-gray-500">Batch No</div>
              <div className="w-[15%] p-4 font-black uppercase text-xs text-gray-500 text-center">Qty (Bags/Box)</div>
              <div className="w-[15%] p-4 font-black uppercase text-xs text-gray-500 text-center">Multiplier</div>
              <div className="w-[15%] p-4 font-black uppercase text-xs text-gray-800 bg-yellow-50/50 text-center">Total PCs</div>
              <div className="w-[10%] font-black uppercase text-xs text-gray-600 text-center flex items-center justify-center">Act</div>
            </div>

            {/* Items List */}
            <div className="flex flex-col bg-white">
              {fields.map((field, index) => {
                const cat = watchItems[index]?.category || ""
                const bags = Number(watchItems[index]?.bags) || 0
                const mult = Number(watchItems[index]?.mult) || 1
                
                let totalPcs = bags * mult;
                let capFormulaText = "";
                if (cat === "CAP") {
                  const w = Number(watchItems[index]?.weight) || 0;
                  const b = Number(watchItems[index]?.bags) || 0;
                  if (w > 0 && b > 0) {
                    const capNetWeight = w - (b * 0.88);
                    totalPcs = capNetWeight > 0 ? Math.round(capNetWeight / 0.002125) : 0;
                    capFormulaText = `Net: ${capNetWeight.toFixed(2)}kg ÷ 0.002125 = ${totalPcs} Pcs`;
                  } else if (w > 0 && b === 0) {
                    totalPcs = Math.round(w / 0.002125);
                    capFormulaText = `Net: ${w.toFixed(2)}kg ÷ 0.002125 = ${totalPcs} Pcs`;
                  } else if (b > 0 && w === 0) {
                    totalPcs = b * 4000;
                    capFormulaText = `${b} Boxes × 4000 = ${totalPcs} Pcs`;
                  } else {
                    totalPcs = 0;
                    capFormulaText = `Please enter Boxes or Gross Wt`;
                  }
                }
                
                
                let availableMultipliers: number[] = MULTIPLIERS.BOTTLE_800
                if (cat === "BOTTLE 425ml") availableMultipliers = MULTIPLIERS.BOTTLE_425
                if (cat.includes("BOX") && !cat.includes("CARTON/BOX")) availableMultipliers = MULTIPLIERS.BOX
                if (cat === "CARTON/BOX - CAP") availableMultipliers = MULTIPLIERS.CARTON_CAP
                if (cat === "WRAPPING - HAND") availableMultipliers = MULTIPLIERS.WRAPPING_HAND
                if (cat === "WRAPPING - MACHINE") availableMultipliers = MULTIPLIERS.WRAPPING_MACHINE
                if (cat === "TAPE - OPP") availableMultipliers = MULTIPLIERS.TAPE_OPP
                if (cat === "TAPE - MACHINE") availableMultipliers = MULTIPLIERS.TAPE_MACHINE
                if (cat === "MACHINE STRETCH FILM") availableMultipliers = MULTIPLIERS.MACHINE_STRETCH_FILM
                if (cat.includes("LABEL")) availableMultipliers = MULTIPLIERS.LABEL
                
                const isNoMult = cat === "CAP" || cat.includes("LABEL")
                if (isNoMult) availableMultipliers = []

                const categoryReg = register(`items.${index}.category`)

                return (
                  <div key={field.id} className="flex flex-col md:flex-row md:items-center border-b-[3px] md:border-b-2 border-gray-200 p-5 md:p-2 gap-4 md:gap-2 relative">
                    
                    {/* Delete button (Top Right on Mobile) */}
                    <button type="button" onClick={() => remove(index)} className="md:hidden absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 border-2 border-red-100 rounded bg-red-50/50">
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="w-full md:w-[20%] pr-14 md:pr-0">
                      <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Category</label>
                      <select 
                        {...categoryReg} 
                        onChange={(e) => {
                          categoryReg.onChange(e);
                          const newCat = e.target.value;
                          let newMult = MULTIPLIERS.BOTTLE_800[0];
                          if (newCat === "BOTTLE 425ml") newMult = MULTIPLIERS.BOTTLE_425[0];
                          if (newCat.includes("BOX") && !newCat.includes("CARTON/BOX")) newMult = MULTIPLIERS.BOX[0];
                          if (newCat === "CARTON/BOX - CAP") newMult = MULTIPLIERS.CARTON_CAP[0];
                          if (newCat === "WRAPPING - HAND") newMult = MULTIPLIERS.WRAPPING_HAND[0];
                          if (newCat === "WRAPPING - MACHINE") newMult = MULTIPLIERS.WRAPPING_MACHINE[0];
                          if (newCat === "TAPE - OPP") newMult = MULTIPLIERS.TAPE_OPP[0];
                          if (newCat === "TAPE - MACHINE") newMult = MULTIPLIERS.TAPE_MACHINE[0];
                          if (newCat === "MACHINE STRETCH FILM") newMult = MULTIPLIERS.MACHINE_STRETCH_FILM[0];
                          if (newCat.includes("LABEL")) newMult = MULTIPLIERS.LABEL[0];
                          setValue(`items.${index}.mult`, newMult);
                        }}
                        className="w-full p-3 md:p-2 border-2 border-gray-300 bg-white font-bold outline-none focus:border-black uppercase text-sm"
                      >
                        <option value="BOTTLE 800ml">BOTTLE 800ml</option>
                        <option value="BOTTLE 425ml">BOTTLE 425ml</option>
                        <option value="BOX 800x20">BOX 800ml x 20</option>
                        <option value="BOX 800x12">BOX 800ml x 12</option>
                        <option value="BOX 425x24">BOX 425ml x 24</option>
                        <option value="BOX 425x6">BOX 425ml x 6</option>
                        <option value="CAP">CAP</option>
                        <option value="LABEL">LABEL (Rolls)</option>
                        <option value="CARTON/BOX - CAP">CARTON/BOX - CAP</option>
                        <option value="WRAPPING - HAND">WRAPPING - HAND</option>
                        <option value="WRAPPING - MACHINE">WRAPPING - MACHINE</option>
                        <option value="TAPE - OPP">TAPE - OPP</option>
                        <option value="TAPE - MACHINE">TAPE - MACHINE</option>
                        <option value="MACHINE STRETCH FILM">MACHINE STRETCH FILM</option>
                      </select>
                    </div>

                    <div className="w-full md:w-[25%]" id={`item-${index}-batchNo`}>
                      <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Batch No</label>
                      <input 
                        type="text" 
                        placeholder={cat.includes("BOTTLE") ? "xxxxxx-xx" : "Batch No"}
                        {...register(`items.${index}.batchNo`)} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (cat.includes("BOTTLE")) {
                            val = val.replace(/[^0-9]/g, ''); // keep only numbers
                            if (val.length > 6) {
                              val = val.slice(0, 6) + '-' + val.slice(6, 8);
                            }
                          }
                          setValue(`items.${index}.batchNo`, val, { shouldValidate: true, shouldDirty: true });
                        }}
                        maxLength={cat.includes("BOTTLE") ? 9 : undefined}
                        className="w-full p-3 md:p-2 border-2 border-gray-300 bg-white font-bold outline-none focus:border-black uppercase text-sm" 
                      />
                    </div>

                    <div className="flex w-full md:w-[30%] gap-3 md:gap-2">
                      <div className="w-1/2" id={`item-${index}-bags`}>
                        <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">{cat === "CAP" ? "Total Boxes" : "Qty (Bags/Box/Roll)"}</label>
                        <input type="number" step="1" min="0" placeholder="0" {...register(`items.${index}.bags`)} className="w-full text-center p-3 md:p-2 border-2 border-gray-300 font-bold outline-none focus:border-black text-sm" />
                      </div>
                      <div className="w-1/2" id={`item-${index}-weight`}>
                        <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">{cat === "CAP" ? "Gross Wt (kg)" : "Multiplier"}</label>
                        {cat === "CAP" ? (
                          <input type="number" step="0.01" min="0" placeholder="kg" {...register(`items.${index}.weight`)} className="w-full text-center p-3 md:p-2 border-2 border-blue-400 bg-blue-50 font-bold outline-none focus:border-blue-600 text-sm text-blue-800" />
                        ) : isNoMult ? (
                          <div className="w-full p-3 md:p-2 border-2 border-gray-100 bg-gray-50 text-gray-400 font-bold text-sm text-center">
                            -
                          </div>
                        ) : (
                          <select {...register(`items.${index}.mult`)} className="w-full p-3 md:p-2 border-2 border-gray-300 font-bold outline-none bg-white text-sm">
                            {availableMultipliers.map(m => <option key={m} value={m}>x {m}</option>)}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="w-full md:w-[15%]">
                      <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Total PCs</label>
                      <div className="w-full p-3 md:p-2 text-center font-black text-2xl md:text-lg text-emerald-700 bg-emerald-50/50 border-2 border-emerald-100 md:border-transparent flex flex-col justify-center items-center">
                        <span>{(isNoMult && cat !== "CAP") ? "-" : totalPcs}</span>
                      </div>
                    </div>

                    <div className="hidden md:flex w-[10%] justify-center items-center">
                      <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>

                    {cat === "CAP" && (
                      <div className="w-full bg-blue-50 text-blue-800 text-[10px] font-bold p-2 mt-2 md:mt-0 border border-blue-200">
                        *Formula Cap: Net Weight = Gross Weight - (Total Boxes × 0.88kg). 1 Cap ≈ 2.125g. <br/>
                        {capFormulaText}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-emerald-50 p-4 sm:p-6 border-t-2 border-emerald-200 flex flex-col sm:flex-row justify-end items-center gap-4 sm:gap-6">
            <div className="text-emerald-900 font-bold uppercase tracking-widest text-sm text-center sm:text-right w-full sm:w-auto">
              Total Incoming:
            </div>
            <div className="flex gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="bg-white px-4 py-2 border-2 border-emerald-200 shadow-sm flex-1 sm:flex-none text-center">
                <span className="font-black text-xl text-emerald-800">{totalBags}</span> <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest block sm:inline">Bags/Box</span>
              </div>
              <div className="bg-white px-4 py-2 border-2 border-emerald-200 shadow-sm flex-1 sm:flex-none text-center">
                <span className="font-black text-xl text-emerald-800">{totalPcs}</span> <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest block sm:inline">Total Pcs</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 border-t border-gray-300">
            <button type="button" onClick={() => append({ category: "BOTTLE 800ml", batchNo: "", bags: 0, mult: 225, weight: 0 })} className="text-xs font-black uppercase tracking-wider flex items-center text-black border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
              <Plus className="h-4 w-4 mr-2" /> Add Item Row
            </button>
          </div>
        </div>

        <div className="pt-8 border-t-[3px] border-black flex justify-center md:justify-end">
          <button disabled={isSubmitting} type="submit" className="w-full md:w-auto bg-emerald-600 text-white px-12 py-5 font-black uppercase tracking-widest text-lg hover:bg-emerald-800 transition-colors shadow-[6px_6px_0px_0px_rgba(100,100,100,1)] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] flex items-center justify-center border-[3px] border-emerald-900 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-6 w-6 mr-3 animate-spin" /> : <Save className="h-6 w-6 mr-3" />} 
            Save to Database
          </button>
        </div>

      </form>
    </div>
  )
}
