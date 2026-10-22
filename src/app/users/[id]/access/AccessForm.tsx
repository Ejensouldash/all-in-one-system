"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { updateUserModules } from "@/app/actions/user"
import {
  Save, Loader2, Search, CheckCircle2, RotateCcw, SearchX, AlertTriangle,
  Wrench, ClipboardList, ClipboardCheck, ArrowRightLeft,
  Warehouse, Boxes, History, Database, PackageOpen,
  CalendarDays, CalendarClock, Megaphone, QrCode,
  Users, Activity, Settings,
  Workflow, Factory, Building2, ShieldCheck,
  LayoutDashboard, FileSpreadsheet, BellRing,
  ShoppingCart, FileSearch, FileCheck, FilePenLine, Trash2, UserCheck, BookmarkCheck,
  Briefcase, Headphones, HardHat, Layers, Crown, ChevronDown, Bot,
  type LucideIcon,
} from "lucide-react"

type ModuleDef = { id: string; name: string; description: string; icon: LucideIcon }
type CategoryDef = { id: string; name: string; icon: LucideIcon; iconClass: string; modules: ModuleDef[] }

const MODULE_CATEGORIES: CategoryDef[] = [
  {
    id: "OPERATIONS",
    name: "Operations",
    icon: Workflow,
    iconClass: "bg-blue-50 text-blue-600 border-blue-100",
    modules: [
      { id: "TICKETS", name: "IT Resolution Workspace (Tickets)", description: "Manage and resolve IT issues.", icon: Wrench },
      { id: "FORMS", name: "Digital Operations (Forms)", description: "Submit and approve daily production reports.", icon: ClipboardList },
      { id: "HANDOVER", name: "Production Handover Form", description: "Access to generate and send production handover forms.", icon: ArrowRightLeft },
    ],
  },
  {
    id: "SALES_ORDERING",
    name: "Sales Ordering Department",
    icon: ShoppingCart,
    iconClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
    modules: [
      { id: "SALES_ORDERING_DASHBOARD", name: "Dashboard Tab", description: "View the Sales Ordering dashboard, queue counts and recent document summary.", icon: LayoutDashboard },
      { id: "SALES_ORDERING_CUSTOMERS", name: "Customers Tab", description: "View and search the Customer Master tab.", icon: Users },
      { id: "SALES_ORDERING_DOCUMENTS", name: "Documents Tab", description: "View Customer Document Control and consolidated intake/credit check records.", icon: FileCheck },
      { id: "SALES_ORDERING_INTAKE", name: "PO Upload Tab", description: "Upload customer purchase order PDFs and view document review screens.", icon: FileSearch },
      { id: "SALES_ORDERING_CREDIT_CHECK", name: "PO-SOA Check Tab", description: "Review customer PO against SOA, evaluate credit terms/aging breakdown, and approve/reject credit clearance.", icon: ShieldCheck },
      { id: "SALES_ORDERING_ORDERS", name: "Sales Orders Tab", description: "View Sales Orders and allow approved intake data to create a draft Sales Order.", icon: ShoppingCart },
      { id: "SALES_ORDERING_CUSTOMERS_MANAGE", name: "Customer Master Admin", description: "Import or update the Sage X3 customer master. Give Customers Tab too.", icon: FilePenLine },
      { id: "SALES_ORDERING_DOCUMENT_MANAGE", name: "Edit / Delete Documents", description: "Correct AI-extracted document data, save review changes, retry AI and delete an intake before an SO exists.", icon: Trash2 },
    ],
  },
  {
    id: "BUSINESS_DEVELOPMENT",
    name: "Business Development",
    icon: Briefcase,
    iconClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
    modules: [
      {
        id: "CUSTOMER_CARE_VIEW",
        name: "Customer Care (View Only)",
        description: "View the customer complaints queue, case details, and export Batch Investigation Reports.",
        icon: FileSearch,
      },
      {
        id: "CUSTOMER_CARE_MANAGE",
        name: "Customer Care (Full Management)",
        description: "Intake new complaints, update case status, edit internal notes, and perform batch re-linking.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "MAINTENANCE",
    name: "Facilities Maintenance (FMS)",
    icon: Wrench,
    iconClass: "bg-cyan-50 text-cyan-600 border-cyan-100",
    modules: [
      { id: "MAINTENANCE_DASHBOARD", name: "FMS Inventory Dashboard", description: "Log stock check-ins, check-outs, and manage assets.", icon: LayoutDashboard },
      { id: "MAINTENANCE_TICKETS_MANAGE", name: "FMS Work Requests & Management", description: "Access to manage, assign PIC, update status, and track KPI for facilities work requests (BOSB-FMS-850-001-QR01).", icon: Wrench },
      { id: "MAINTENANCE_INVENTORY_EDIT", name: "FMS Inventory Master Edit", description: "Authority to edit, rename, or update master item names and brand details in FMS Inventory.", icon: FilePenLine },
      { id: "MAINTENANCE_ASSETS", name: "FMS Asset (NRHO)", description: "Access to view, check-in, withdraw, and audit NRHO FMS asset ledger.", icon: Boxes },
      { id: "MAINTENANCE_TECHNICIAN", name: "FMS Technician Assignment", description: "Designate user as an internal technician eligible for work request assignments.", icon: UserCheck },
    ],
  },
  {
    id: "GMP_QUALITY",
    name: "GMP & Quality",
    icon: ClipboardCheck,
    iconClass: "bg-teal-50 text-teal-600 border-teal-100",
    modules: [
      { id: "GMP_FORMS", name: "GMP Checklists & Forms", description: "Access to view and submit daily GMP compliance checklists and QA/QC forms.", icon: ClipboardList },
      { id: "GMP_REPORTS", name: "GMP Reports", description: "Access to generate and print monthly GMP compliance reports.", icon: FileSpreadsheet },
      { id: "GMP_SUMMARY", name: "GMP Checklists Summary & Sign-off", description: "Access to view, edit, delete, and sign all submitted GMP checklists.", icon: FileSpreadsheet },
      { id: "RETENTION_SAMPLE_MANAGE", name: "Retention Sample Management", description: "Access to edit, correct, and void retention sample records (SGMP/21/RSR) with GMP audit trail.", icon: BookmarkCheck },
      { id: "PALLET_LEDGER", name: "Returnable Pallet Ledger", description: "Maintain the separate wooden-pallet movement ledger under GMP.", icon: Boxes },
    ],
  },
  {
    id: "WAREHOUSE_PRODUCTION",
    name: "Warehouse & Production",
    icon: Factory,
    iconClass: "bg-amber-50 text-amber-600 border-amber-100",
    modules: [
      { id: "WAREHOUSE", name: "Warehouse & Transfer In", description: "Manage inventory and incoming deliveries.", icon: Warehouse },
      { id: "GATEPASS_REQUESTER", name: "Gatepass Requester", description: "Create Gatepass planning requests and issue the secure customer form link. Does not move product stock.", icon: ClipboardList },
      { id: "WAREHOUSE_GATEPASS", name: "Warehouse Gatepass Operations", description: "Acknowledge, prepare and confirm loading for Gatepass requests. Does not change Production or InventoryBatch.", icon: Warehouse },
      { id: "SECURITY_GATEPASS", name: "Security Gatepass Check-In/Out", description: "Scan Gatepass QR and record vehicle check-in or check-out only.", icon: ShieldCheck },
      { id: "RAW_MATERIAL_WITHDRAWAL", name: "Ambil Bahan dari Warehouse", description: "Record raw material taken off the warehouse rack. Grants the Daily Raw Material screens only, not the rest of the warehouse module.", icon: PackageOpen },
      { id: "RAW_MATERIAL_WITHDRAWAL_BACKDATE", name: "Ambil Bahan — Rekod Tarikh Lepas", description: "Allows recording a withdrawal that was missed on the day, up to 7 days back, with a written reason. The generated DO is still posted with today's date so production can claim it.", icon: CalendarClock },
      { id: "PRODUCTION_STOCK", name: "Production Stock", description: "View and manage production stock balances.", icon: Boxes },
      { id: "TRANSFER_IN_HISTORY", name: "Transfer In History", description: "View, edit, and delete transfer in historical records.", icon: History },
      { id: "DAILY_REPORT_EDIT_APPROVED", name: "Edit Approved Daily Report", description: "Allows editing production daily reports even after they have been approved.", icon: FileSpreadsheet },
      { id: "KBP", name: "KBP — Batch QR", description: "Generate and print batch QR stickers for the Pedas bottle & cap machines.", icon: QrCode },
      { id: "DATABASE_MANAGER", name: "Production Database", description: "Manage raw database records for production.", icon: Database },
      { id: "CHATBOT_PRODUCTION", name: "Chatbot - Production (Aria)", description: "Access to the production chatbot functionality, plus saved chat history the user can reopen.", icon: Bot, }
    ],
  },
  {
    id: "COMPANY_FACILITIES",
    name: "Company & Facilities",
    icon: Building2,
    iconClass: "bg-violet-50 text-violet-600 border-violet-100",
    modules: [
      { id: "EVENTS", name: "Events & Facilities", description: "Manage company events and calendar.", icon: CalendarDays },
      { id: "REMINDERS", name: "PMC (Preventive Maintenance Calendar)", description: "Preventive maintenance schedules, calendar, routine checklists, and inspection records (SGMP-03).", icon: BellRing },
      { id: "REMINDERS_ASSIGN_PIC", name: "Assign PMC PIC", description: "Permission to assign, select, or reassign PIC for Preventive Maintenance schedules and inspection tasks (SGMP-03).", icon: UserCheck },
      { id: "REMINDERS_EDIT_WORK", name: "Edit PMC Work Instructions", description: "Authority to edit work instructions and checklist steps for Preventive Maintenance schedules and tasks (SGMP-03).", icon: FilePenLine },
      { id: "REMINDERS_EDIT_FREQUENCY", name: "Manage PMC Frequency", description: "Authority to change recurrence intervals and frequencies for Preventive Maintenance schedules.", icon: CalendarClock },
      { id: "NOTICES", name: "Internal Notices", description: "Post and read company-wide announcements.", icon: Megaphone },
      { id: "ASSETS", name: "Company Assets", description: "Manage, track, and print QR for company assets and equipment.", icon: QrCode },
    ],
  },
  {
    id: "ADMINISTRATION",
    name: "Administration",
    icon: ShieldCheck,
    iconClass: "bg-rose-50 text-rose-600 border-rose-100",
    modules: [
      { id: "USERS", name: "User Management", description: "Access to the user directory and organization structure.", icon: Users },
      { id: "USER_LOGS", name: "User Activity Logs", description: "Monitor user actions across the system.", icon: Activity },
      { id: "SETTINGS", name: "System Settings", description: "Configure system parameters and cost catalogs.", icon: Settings },
    ],
  },
    {
    id: "MARKETING",
    name: "Marketing",
    icon: Megaphone,
    iconClass: "bg-pink-50 text-pink-600 border-pink-100",
    modules: [
      { id: "MARKETING_FORMS", name: "Marketing Forms & Templates", description: "Access to view and submit marketing requisition forms.", icon: ClipboardList },
      { id: "MARKETING_ASSETS", name: "Marketing Asset Management", description: "Manage marketing department assets, loans, and returns.", icon: Boxes },
      { id: "MARKETING_INVENTORY", name: "Marketing Inventory Management", description: "Track marketing stock, merchandise check-in/out, and logs.", icon: PackageOpen },
    ],
  },
  {
    id: "NRHO_PROJECT",
    name: "NRHO Project Hub",
    icon: HardHat,
    iconClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
    modules: [
      { id: "NRHO_PROJECT_VIEW", name: "Projects Dashboard & Catalog", description: "Access to view the NRHO projects dashboard, list, and project overview.", icon: LayoutDashboard },
      { id: "NRHO_PROJECT_MANAGE", name: "Project Registration & Settings", description: "Register new projects, edit project details, site locations, and project managers.", icon: Building2 },
      { id: "NRHO_PROJECT_BQ", name: "Quotations & Bill of Quantities (BQ)", description: "Manage and edit Bill of Quantities line items, units, rates, and cost estimates.", icon: FileSpreadsheet },
      { id: "NRHO_PROJECT_TIMELINE", name: "Work Planning & Weekly Timeline", description: "Plan weekly tasks, update completion status, and reschedule tasks with mandatory delay justifications.", icon: CalendarDays },
      { id: "NRHO_PROJECT_FINANCIAL", name: "Procurement & Financial (PO / DO / Invoices)", description: "Manage Purchase Orders, site Delivery Orders, and vendor Invoices with payment status.", icon: ShoppingCart },
      { id: "NRHO_PROJECT_BLUEPRINTS", name: "Floor Plans & Blueprints", description: "Upload, view, and manage architectural floor plans, CAD drawings, and site blueprints.", icon: Layers },
      { id: "NRHO_PROJECT_APPROVALS", name: "Boss Presentation & Management Approvals", description: "Submit project proposals for management review and approve/reject project budgets.", icon: Crown },
    ],
  },
]

const ALL_MODULES = MODULE_CATEGORIES.flatMap(c => c.modules)

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <div
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-emerald-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </div>
  )
}

export function AccessForm({ userId, initialModules }: { userId: string, initialModules: string[] }) {
  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [query, setQuery] = useState("")
  const router = useRouter()

  const initial = initialModules || []

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initialOpen: Record<string, boolean> = {}
    MODULE_CATEGORIES.forEach(cat => {
      const hasActive = cat.modules.some(m => (initialModules || []).includes(m.id))
      initialOpen[cat.id] = hasActive
    })
    return initialOpen
  })
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL")

  const hasChanges = useMemo(() => {
    return [...selectedModules].sort().join(",") !== [...initial].sort().join(",")
  }, [selectedModules, initial])

  const changesCount = useMemo(() => {
    const added = selectedModules.filter(m => !initial.includes(m)).length
    const removed = initial.filter(m => !selectedModules.includes(m)).length
    return added + removed
  }, [selectedModules, initial])

  const filteredCategories = useMemo(() => {
    let cats = MODULE_CATEGORIES
    if (selectedCategoryFilter !== "ALL") {
      cats = cats.filter(cat => cat.id === selectedCategoryFilter)
    }
    const q = query.trim().toLowerCase()
    if (!q) return cats
    return cats
      .map(cat => ({
        ...cat,
        modules: cat.modules.filter(m =>
          m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.modules.length > 0)
  }, [query, selectedCategoryFilter])

  const toggleCategoryDropdown = (catId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }))
  }

  const allExpanded = useMemo(() => {
    return filteredCategories.every(cat => Boolean(openCategories[cat.id]))
  }, [filteredCategories, openCategories])

  const toggleExpandAll = () => {
    if (allExpanded) {
      setOpenCategories({})
    } else {
      const allOpen: Record<string, boolean> = {}
      MODULE_CATEGORIES.forEach(c => { allOpen[c.id] = true })
      setOpenCategories(allOpen)
    }
  }

  const toggleModule = (moduleId: string) => {
    if (isSubmitting || saveState === "success") return
    setSaveState("idle")
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleSelectAll = () => {
    if (isSubmitting || saveState === "success") return
    setSaveState("idle")
    setSelectedModules(
      selectedModules.length === ALL_MODULES.length ? [] : ALL_MODULES.map(m => m.id)
    )
  }

  const toggleCategory = (cat: CategoryDef) => {
    if (isSubmitting || saveState === "success") return
    setSaveState("idle")
    const catIds = cat.modules.map(m => m.id)
    const allSelected = catIds.every(id => selectedModules.includes(id))
    setSelectedModules(prev =>
      allSelected
        ? prev.filter(id => !catIds.includes(id))
        : [...new Set([...prev, ...catIds])]
    )
  }

  const handleDiscard = () => {
    if (isSubmitting || saveState === "success") return
    setSelectedModules(initial)
    setSaveState("idle")
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setSaveState("idle")
    const res = await updateUserModules(userId, selectedModules)
    setIsSubmitting(false)
    if (res.success) {
      setSaveState("success")
      setTimeout(() => {
        router.push("/users")
        router.refresh()
      }, 1200)
    } else {
      setSaveState("error")
      setErrorMsg(res.error || "Something went wrong.")
    }
  }

  const grantedCount = selectedModules.length
  const progressPct = Math.round((grantedCount / ALL_MODULES.length) * 100)

  return (
    <div className="space-y-5">
      {/* Summary & controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-baseline justify-between sm:justify-start sm:gap-3">
              <h2 className="font-semibold text-gray-800">Granted Modules</h2>
              <span className="text-sm font-bold text-gray-900">
                {grantedCount}
                <span className="font-medium text-gray-400"> / {ALL_MODULES.length}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full sm:max-w-xs rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown Filter */}
            <div className="relative">
              <select
                value={selectedCategoryFilter}
                onChange={e => {
                  const val = e.target.value
                  setSelectedCategoryFilter(val)
                  if (val !== "ALL") {
                    setOpenCategories(prev => ({ ...prev, [val]: true }))
                  }
                }}
                className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium text-gray-700 transition-colors"
              >
                <option value="ALL">All Categories ({MODULE_CATEGORIES.length})</option>
                {MODULE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.modules.length})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full sm:w-48 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Expand / Collapse All & Select All */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleExpandAll}
                className="text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold uppercase tracking-wide text-blue-600 hover:text-blue-800 transition-colors px-1"
              >
                {selectedModules.length === ALL_MODULES.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category sections */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 flex flex-col items-center justify-center text-center">
          <SearchX className="h-10 w-10 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">No modules found</p>
          <p className="text-sm text-gray-500 mt-1">No module matches &quot;{query}&quot;. Try a different keyword.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map(cat => {
            const CatIcon = cat.icon
            const catIds = cat.modules.map(m => m.id)
            const selectedInCat = catIds.filter(id => selectedModules.includes(id)).length
            const allInCatSelected = selectedInCat === catIds.length
            const isSearching = Boolean(query.trim())
            const isExpanded = isSearching || Boolean(openCategories[cat.id])

            return (
              <div 
                key={cat.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200"
              >
                {/* Collapsible Dropdown Header */}
                <div
                  onClick={() => toggleCategoryDropdown(cat.id)}
                  className="w-full px-5 py-3.5 bg-gray-50/60 hover:bg-gray-100/70 cursor-pointer flex items-center justify-between transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${cat.iconClass}`}>
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{cat.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        selectedInCat > 0 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {selectedInCat}/{catIds.length} active
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCategory(cat)
                      }}
                      className="text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-white"
                    >
                      {allInCatSelected ? "Clear" : "Select all"}
                    </button>
                    <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Dropdown Content / Modules List */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50 animate-in fade-in duration-150">
                    {cat.modules.map(module => {
                      const ModIcon = module.icon
                      const isSelected = selectedModules.includes(module.id)
                      return (
                        <button
                          key={module.id}
                          type="button"
                          role="switch"
                          aria-checked={isSelected}
                          onClick={() => toggleModule(module.id)}
                          className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors duration-150 ${
                            isSelected ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className={`h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                              : "bg-gray-100 border-gray-200 text-gray-400"
                          }`}>
                            <ModIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isSelected ? "text-gray-900" : "text-gray-600"}`}>
                              {module.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{module.description}</p>
                          </div>
                          <ToggleSwitch checked={isSelected} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky save bar — only appears when there are unsaved changes */}
      {(hasChanges || saveState !== "idle") && (
        <div className="sticky bottom-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`rounded-xl shadow-lg px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border ${
            saveState === "success"
              ? "bg-emerald-600 border-emerald-500 text-white"
              : saveState === "error"
              ? "bg-red-600 border-red-500 text-white"
              : "bg-gray-900 border-gray-800 text-white"
          }`}>
            <div className="flex items-center gap-2.5 text-sm font-medium">
              {saveState === "success" ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Access updated successfully! Redirecting...
                </>
              ) : saveState === "error" ? (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  Failed to update access: {errorMsg}
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  {changesCount} unsaved change{changesCount !== 1 ? "s" : ""}
                </>
              )}
            </div>
            {saveState !== "success" && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleDiscard}
                  disabled={isSubmitting}
                  className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !hasChanges}
                  className="flex items-center px-5 py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
