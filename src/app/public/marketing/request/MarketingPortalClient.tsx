"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { PublicMarketingRequestForm } from "./PublicMarketingRequestForm"
import { MarketingEventRequestForm } from "../MarketingEventRequestForm"
import { 
  ChevronRight,
  ShieldCheck,
  Flame,
  Camera,
  Truck,
  Box,
  Calendar
} from "lucide-react"

type FormType = "asset" | "event" | null

export function MarketingPortalClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const typeParam = searchParams.get("type") as FormType
  const selectedForm: FormType = typeParam === "asset" || typeParam === "event" ? typeParam : null

  const handleSelectForm = (type: "asset" | "event") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("type", type)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleBackToMenu = () => {
    router.push(pathname)
  }

  // If user selected Asset & Merchandise Requisition
  if (selectedForm === "asset") {
    return <PublicMarketingRequestForm onBack={handleBackToMenu} />
  }

  // If user selected Event Requisition
  if (selectedForm === "event") {
    return <MarketingEventRequestForm onBack={handleBackToMenu} />
  }

  // MAIN PORTAL SELECTION VIEW (2 stacked cards as in sketch)
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Portal Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Bubbles O2 Marketing Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
          Marketing Requisition
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
          Please select the type of requisition you would like to submit to the Marketing Department.
        </p>
      </div>

      {/* 2 Stacked Cards (Top & Bottom like sketch) */}
      <div className="flex flex-col gap-5">
        {/* CARD 1 (TOP): Asset & Merchandise Requisition */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectForm("asset")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleSelectForm("asset")
            }
          }}
          className="group relative bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 hover:border-blue-600 shadow-md hover:shadow-xl transition-all duration-200 text-left cursor-pointer transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        >
          {/* Subtle gradient glow in corner */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Box className="w-7 h-7" />
              </div>

              {/* Text Info */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-[10px] tracking-wide">
                    SOP BOSB-MKT-850-002-QR01
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Equipment &amp; Inventory
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  Marketing Assets &amp; Merchandise Requisition
                </h2>

                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Borrow official departmental marketing assets (furniture, audio/visual, display tech, promotional booth fixtures) or request branded promotional merchandise.
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Furniture
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Display Tech
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Merchandise
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Asset Loans
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Pill / Arrow */}
            <div className="shrink-0 flex items-center justify-end sm:justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 group-hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm group-hover:shadow-md transition-all">
                <span>Select Form</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2 (BOTTOM): Event Requisition */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectForm("event")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleSelectForm("event")
            }
          }}
          className="group relative bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 hover:border-indigo-600 shadow-md hover:shadow-xl transition-all duration-200 text-left cursor-pointer transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
        >
          {/* Subtle gradient glow in corner */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Calendar className="w-7 h-7" />
              </div>

              {/* Text Info */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px] tracking-wide uppercase">
                    New Form
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Event Collaboration
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Event Requisition
                </h2>

                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Official requisition form for company, CSR, sports, exhibitions, and partnership events requiring marketing collaboration and on-ground assistance.
                </p>

                {/* Feature Tags for the 3 requirements */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200/60 text-orange-700 text-[10px] font-semibold">
                    <Flame className="w-3 h-3" />
                    Activation
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/60 text-blue-700 text-[10px] font-semibold">
                    <Camera className="w-3 h-3" />
                    Media
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-semibold">
                    <Truck className="w-3 h-3" />
                    Logistic
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Pill / Arrow */}
            <div className="shrink-0 flex items-center justify-end sm:justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 group-hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm group-hover:shadow-md transition-all">
                <span>Select Form</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-4">
        <p className="text-[11px] text-slate-400">
          Bubbles O2 Marketing Sdn Bhd • Marketing Department • Internal Requisition System
        </p>
      </div>
    </div>
  )
}
