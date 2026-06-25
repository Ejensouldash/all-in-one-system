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
  LABEL: [1]
}

export function TransferInForm({ userName }: { userName: string }) {
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      receiveDate: new Date().toISOString().split('T')[0],
      receiveTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
      receiverName: userName || "",
      doNumber: "",
      
      items: [
        { category: "BOTTLE 800ml", batchNo: "", bags: 0, mult: 225 }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const watchItems = watch("items")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
       if (!data.items[i].batchNo) {
          return showErrorAndScroll(`item-${i}-batchNo`, `Please fill in the Batch No for item #${i + 1}.`)
       }
       if (!data.items[i].bags || Number(data.items[i].bags) <= 0) {
          return showErrorAndScroll(`item-${i}-bags`, `Please fill in the Quantity (Bags/Box) for item #${i + 1}.`)
       }
    }

    setIsSubmitting(true)
    
    const rawDo = data.doNumber.replace(/[^0-9]/g, '')
    const formattedData = {
      ...data,
      doNumber: rawDo ? `DO - ${rawDo}` : ""
    }

    const result = await createTransferIn(formattedData)
    setIsSubmitting(false)

    if (result.success) {
      alert("DO Received & Synced to Database successfully!")
      window.location.href = "/forms"
    } else {
      alert("Error: " + result.error)
    }
  }

  // Calculate totals
  const totalBags = watchItems.reduce((sum: number, item: any) => sum + (Number(item.bags) || 0), 0)
  
  const totalPcs = watchItems.reduce((sum: number, item: any) => {
    const cat = item.category || ""
    if (cat.includes("CAP") || cat.includes("LABEL")) return sum // exclude cap and label from pcs
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
            <div className="flex border-2 border-black bg-white focus-within:ring-2 focus-within:ring-black">
              <div className="px-3 py-3 bg-gray-100 border-r-2 border-black font-black flex items-center text-gray-800 whitespace-nowrap">
                DO -
              </div>
              <input 
                type="text" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                {...register("doNumber")} 
                placeholder="1234567" 
                className="w-full p-3 font-bold focus:outline-none bg-white" 
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
                const bags = Number(watchItems[index]?.bags) || 0
                const mult = Number(watchItems[index]?.mult) || 1
                const totalPcs = bags * mult
                const cat = watchItems[index]?.category || ""
                
                let availableMultipliers: number[] = MULTIPLIERS.BOTTLE_800
                if (cat === "BOTTLE 425ml") availableMultipliers = MULTIPLIERS.BOTTLE_425
                if (cat.includes("BOX")) availableMultipliers = MULTIPLIERS.BOX
                if (cat.includes("LABEL")) availableMultipliers = MULTIPLIERS.LABEL
                
                const isNoMult = cat.includes("CAP") || cat.includes("LABEL")
                if (isNoMult) availableMultipliers = []

                return (
                  <div key={field.id} className="flex flex-col md:flex-row md:items-center border-b-[3px] md:border-b-2 border-gray-200 p-5 md:p-2 gap-4 md:gap-2 relative">
                    
                    {/* Delete button (Top Right on Mobile) */}
                    <button type="button" onClick={() => remove(index)} className="md:hidden absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 border-2 border-red-100 rounded bg-red-50/50">
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="w-full md:w-[20%] pr-14 md:pr-0">
                      <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Category</label>
                      <select {...register(`items.${index}.category`)} className="w-full p-3 md:p-2 border-2 border-gray-300 bg-white font-bold outline-none focus:border-black uppercase text-sm">
                        <option value="BOTTLE 800ml">BOTTLE 800ml</option>
                        <option value="BOTTLE 425ml">BOTTLE 425ml</option>
                        <option value="BOX 800x20">BOX 800ml x 20</option>
                        <option value="BOX 800x12">BOX 800ml x 12</option>
                        <option value="BOX 425x24">BOX 425ml x 24</option>
                        <option value="BOX 425x6">BOX 425ml x 6</option>
                        <option value="CAP 1881">CAP 1881</option>
                        <option value="LABEL">LABEL (Rolls)</option>
                      </select>
                    </div>

                    <div className="w-full md:w-[25%]" id={`item-${index}-batchNo`}>
                      <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Batch No</label>
                      <input type="text" placeholder="Batch No" {...register(`items.${index}.batchNo`)} className="w-full p-3 md:p-2 border-2 border-gray-300 bg-white font-bold outline-none focus:border-black uppercase text-sm" />
                    </div>

                    <div className="flex w-full md:w-[30%] gap-3 md:gap-2">
                      <div className="w-1/2" id={`item-${index}-bags`}>
                        <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Qty (Bags/Box/Roll)</label>
                        <input type="number" step="1" min="0" placeholder="0" {...register(`items.${index}.bags`)} className="w-full text-center p-3 md:p-2 border-2 border-gray-300 font-bold outline-none focus:border-black text-sm" />
                      </div>
                      <div className="w-1/2">
                        <label className="block md:hidden text-[10px] font-black uppercase text-gray-500 mb-1.5">Multiplier</label>
                        {isNoMult ? (
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
                      <div className="w-full p-3 md:p-2 text-center font-black text-2xl md:text-lg text-emerald-700 bg-emerald-50/50 border-2 border-emerald-100 md:border-transparent">
                        {isNoMult ? "-" : totalPcs}
                      </div>
                    </div>

                    <div className="hidden md:flex w-[10%] justify-center">
                      <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>

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
            <button type="button" onClick={() => append({ category: "BOTTLE 800ml", batchNo: "", bags: 0, mult: 225 })} className="text-xs font-black uppercase tracking-wider flex items-center text-black border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
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
