"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus,
  Headphones,
  AlertTriangle,
  Clock,
  ShieldAlert,
  MessageSquare,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Inbox,
  Sparkles,
  Share2,
  Tag,
} from "lucide-react"
import { CustomerCareQueueTable, ComplaintRow } from "@/components/customer-care/CustomerCareQueueTable"
import { ManualComplaintTable } from "@/components/customer-care/ManualComplaintTable"
import { ManualComplaintItem } from "@/components/customer-care/ManualComplaintEditModal"
import { ManualComplaintModal } from "@/components/customer-care/ManualComplaintModal"
import { SocialComplaintTable, SocialComplaintItem } from "@/components/customer-care/SocialComplaintTable"
import { ManualComplaintPriority, ManualComplaintStatus } from "@prisma/client"

interface CustomerCareDashboardClientProps {
  initialCases: ComplaintRow[]
  initialManualComplaints: ManualComplaintItem[]
  initialSocialComplaints: SocialComplaintItem[]
  canManage: boolean
}

export function CustomerCareDashboardClient({
  initialCases,
  initialManualComplaints,
  initialSocialComplaints,
  canManage,
}: CustomerCareDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"MANUAL" | "SOCIAL" | "BATCH">("MANUAL")
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  // Manual complaints KPIs
  const manualTotal = initialManualComplaints.length
  const manualOpen = initialManualComplaints.filter(
    (c) => c.status === ManualComplaintStatus.OPEN
  ).length
  const manualOngoing = initialManualComplaints.filter(
    (c) => c.status === ManualComplaintStatus.ONGOING
  ).length
  const manualEscalated = initialManualComplaints.filter(
    (c) => c.status === ManualComplaintStatus.ESCALATED_E3
  ).length
  const manualClosed = initialManualComplaints.filter(
    (c) => c.status === ManualComplaintStatus.CLOSED
  ).length

  // Social Media Complaints KPIs
  const socialTotal = initialSocialComplaints.length
  const socialHigh = initialSocialComplaints.filter((c) => c.priority === "High").length
  const socialMedium = initialSocialComplaints.filter((c) => c.priority === "Medium").length
  const socialLow = initialSocialComplaints.filter((c) => c.priority === "Low").length
  const socialWithBatch = initialSocialComplaints.filter((c) => !!c.detectedBatchNo).length

  // Batch cases KPIs
  const batchTotal = initialCases.length
  const batchInvestigating = initialCases.filter(
    (c) => c.status === "UNDER_INVESTIGATION" || c.status === "PENDING_QC"
  ).length
  const batchUnmatched = initialCases.filter((c) =>
    c.items.some((i) => i.matchStatus === "UNMATCHED")
  ).length
  const batchRecalls = initialCases.filter(
    (c) => c.status === "RECALL_INITIATED"
  ).length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <span>Business Development</span>
            <span>/</span>
            <span>Customer Care</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
            <Headphones className="w-6 h-6 text-indigo-600" />
            Customer Complaints & Batch Investigation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Multi-platform complaint logging, social media tracking (Threads), and production batch investigation.
          </p>
        </div>

        {/* Action Buttons: Log Manual Complaint beside Log New Complaint */}
        {canManage && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-200 transition-all hover:shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Manual Complaint
            </button>

            <Link
              href="/business-development/customer-care/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-200 transition-all hover:shadow"
            >
              <Plus className="w-4 h-4" />
              Log New Batch Case
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 flex items-center gap-2 sm:gap-4 overflow-x-auto">
        {/* Tab 1: Manual Complaint Log */}
        <button
          type="button"
          onClick={() => setActiveTab("MANUAL")}
          className={`pb-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "MANUAL"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Manual Complaint Log</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "MANUAL"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {manualTotal}
          </span>
        </button>

        {/* Tab 2: Social Media Tracking */}
        <button
          type="button"
          onClick={() => setActiveTab("SOCIAL")}
          className={`pb-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "SOCIAL"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Social Media Tracking</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "SOCIAL"
                ? "bg-neutral-900 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {socialTotal}
          </span>
        </button>

        {/* Tab 3: Batch Investigations */}
        <button
          type="button"
          onClick={() => setActiveTab("BATCH")}
          className={`pb-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "BATCH"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Batch Investigations</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "BATCH"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {batchTotal}
          </span>
        </button>
      </div>

      {/* Dynamic KPI Cards */}
      {activeTab === "MANUAL" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{manualTotal}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Logged</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-amber-700">{manualOpen + manualOngoing}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Open / In Progress</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-purple-700">{manualEscalated}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Escalated (E3)</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-emerald-700">{manualClosed}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Closed / Resolved</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "SOCIAL" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{socialTotal}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Threads Items</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-rose-700">{socialHigh}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Health Issues (High)</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-amber-700">{socialMedium}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Quality & Smell (Med)</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-indigo-700">{socialWithBatch}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Batch Mentions</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "BATCH" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{batchTotal}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Cases</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-amber-700">{batchInvestigating}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Investigating</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-rose-700">{batchUnmatched}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Unmatched Batches</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-purple-700">{batchRecalls}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Active Recalls</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "MANUAL" && (
        <ManualComplaintTable
          initialRecords={initialManualComplaints}
          canManage={canManage}
          onOpenCreateModal={() => setIsManualModalOpen(true)}
        />
      )}

      {activeTab === "SOCIAL" && (
        <SocialComplaintTable
          initialRecords={initialSocialComplaints}
          canManage={canManage}
        />
      )}

      {activeTab === "BATCH" && (
        <CustomerCareQueueTable
          initialCases={initialCases}
          canManage={canManage}
        />
      )}

      {/* Manual Complaint Intake Modal */}
      <ManualComplaintModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  )
}
