"use client"

import React, { useState } from "react"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"
import { 
  FileText, Search, Plus, ExternalLink, Eye, 
  Sparkles, Layers, Box, Tag, CheckCircle2, Clock, 
  HelpCircle, Printer, X
} from "lucide-react"

type FormTemplate = {
  id: string
  code: string
  title: string
  category: string
  description: string
  purpose: string
  sections: string[]
  badgeColor: string
}

const TEMPLATES: FormTemplate[] = [
  {
    id: "mkt-frm-01",
    code: "MKT-FRM-01",
    title: "Marketing Asset Lending Requisition",
    category: "ASSETS & LENDING",
    description: "Standard requisition to borrow reusable marketing assets such as LED Boards, banquet tables, sofas, and exhibition chairs.",
    purpose: "Lending tracking, venue destination logging, and return accountability.",
    sections: [
      "Requester Details & Contact",
      "Asset Items Selection & Quantities",
      "Destination / Event Venue Information",
      "Lending & Expected Return Schedule",
      "Marketing Approval & Acknowledgment Signature",
    ],
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "mkt-frm-02",
    code: "MKT-FRM-02",
    title: "Merchandise & Promotional Withdrawal Form",
    category: "INVENTORY & WITHDRAWAL",
    description: "Requisition for withdrawing promotional merchandise (t-shirts, caps, umbrellas, corporate gifts) from HQ Store.",
    purpose: "Stock ledger decrement, distribution audit, and event allocation.",
    sections: [
      "Requester & Department",
      "Target Event / Campaign Name",
      "Requested Merchandise List & Quantities",
      "Budget / Allocation Code",
      "Storekeeper Dispatch Sign-off",
    ],
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "mkt-frm-03",
    code: "MKT-FRM-03",
    title: "Event Sponsorship & Booth Setup Request",
    category: "EVENTS & ACTIVATION",
    description: "Application form for requesting marketing presence, booth canopy setup, and branded exhibition materials at internal or external events.",
    purpose: "Event planning, resource reservation, and logistics scheduling.",
    sections: [
      "Event Name, Organizer & Location",
      "Event Dates & Operating Hours",
      "Booth Size & Setup Requirements",
      "Expected Footfall & Branding Exposure",
      "Management Approval",
    ],
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "mkt-frm-04",
    code: "MKT-FRM-04",
    title: "POSM & Marketing Collateral Requisition",
    category: "COLLATERALS & POSM",
    description: "Requisition form for pull-up banners, flyers, brochures, posters, bunting, and table displays for retail or promotions.",
    purpose: "Collateral distribution tracking and stock replenishments.",
    sections: [
      "Store / Partner Branch Details",
      "Collateral Items & Quantities",
      "Campaign Duration",
      "Delivery / Courier Address",
      "Marketing PIC Verification",
    ],
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "mkt-frm-05",
    code: "MKT-FRM-05",
    title: "Product Sampling & PR Seeding Request",
    category: "SAMPLING & PR",
    description: "Formal requisition for cartons of Bubbles O2 mineral water bottles intended for VIP seeding, press packs, or public tasting.",
    purpose: "Product sampling accountability and PR campaign audit.",
    sections: [
      "Campaign / Influencer Details",
      "Bottle SKU & Carton Quantities",
      "Sampling Objective & Expected ROI",
      "Fulfillment & Shipping Schedule",
      "Brand Lead Sign-off",
    ],
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "mkt-frm-06",
    code: "MKT-FRM-06",
    title: "Creative Artwork & Media Production Request",
    category: "CREATIVE & DESIGN",
    description: "Request form for marketing design services including banner designs, social media graphics, product photography, and video edits.",
    purpose: "Creative briefing, turnaround time estimation, and brand compliance.",
    sections: [
      "Project Title & Objective",
      "Deliverable Format & Specifications",
      "Key Messages & Copywriting Brief",
      "Required By Date (Deadline)",
      "Review & Revisions Log",
    ],
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
]

const CATEGORIES = [
  "ALL",
  "ASSETS & LENDING",
  "INVENTORY & WITHDRAWAL",
  "EVENTS & ACTIVATION",
  "COLLATERALS & POSM",
  "SAMPLING & PR",
  "CREATIVE & DESIGN",
]

export function MarketingFormsClient({ userName }: { userName: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)

  const filteredTemplates = TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === "ALL" || tpl.category === selectedCategory
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Nav Header Tabs */}
        <MarketingNavTabs />

        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" />
              Marketing Operations
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              MARKETING FORMS & TEMPLATES
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide mt-1">
              Standardized requisition templates and official forms for marketing operations
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {TEMPLATES.length} Form Templates Available
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-8 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search form templates by title, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 tracking-wider font-mono">
                    {template.code}
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${template.badgeColor}`}>
                    {template.category}
                  </span>
                </div>

                {/* Title & Desc */}
                <h3 className="text-base font-black text-slate-900 group-hover:text-blue-700 transition-colors mb-2">
                  {template.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-4">
                  {template.description}
                </p>

                {/* Form Sections Preview */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-6 space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Form Outline / Fields:
                  </span>
                  {template.sections.slice(0, 3).map((sec, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="truncate">{sec}</span>
                    </div>
                  ))}
                  {template.sections.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-bold block pt-0.5">
                      + {template.sections.length - 3} more sections
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Blank Template
                </button>
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition flex items-center justify-center"
                  title="Print Template"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No form templates found</h3>
            <p className="text-xs text-slate-400 mt-1">Try searching for a different keyword or category.</p>
          </div>
        )}

        {/* Modal: View Blank Template */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono">
                      {selectedTemplate.code}
                    </span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                      Blank Template
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedTemplate.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTemplate.purpose}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Blank Form Body */}
              <div className="p-6 space-y-6 flex-1">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    This form template is currently kept blank as requested. Form schema is ready for future field configuration.
                  </span>
                </div>

                {/* Mock Blank Form Layout */}
                <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-6">
                  {selectedTemplate.sections.map((section, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          {section}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Blank Template Field
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="h-9 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 flex items-center px-3 text-xs text-slate-400 font-medium">
                          [ Input field placeholder ]
                        </div>
                        <div className="h-9 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 flex items-center px-3 text-xs text-slate-400 font-medium">
                          [ Select / Date picker placeholder ]
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Sign-off box */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">
                      Signatures & Approvals (Blank)
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                        <div className="h-16 border-b border-dashed border-slate-200 mb-2"></div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Requester Signature</span>
                      </div>
                      <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                        <div className="h-16 border-b border-dashed border-slate-200 mb-2"></div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Marketing Approval Signature</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
                <span className="text-xs text-slate-400 font-semibold">
                  Bubbles O2 Marketing Operations Document
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Blank Form
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
