"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Info as InfoIcon,
  Layers,
  Link2,
  PackageCheck,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react"
import {
  linkWarehouseGatePassDOAction,
  createWarehouseGatePassDOAction,
  unlinkWarehouseGatePassDOAction,
  publishWarehouseGatePassAction,
  transitionWarehouseGatePassAction,
  updateWarehouseGatePassActualsAction,
} from "@/app/actions/warehouse-gatepass"
import { TactileButton } from "@/components/ui/TactileButton"

type GatePassData = {
  id: string
  gatePassNo: string
  status: string
  purpose: string
  requestedPickupAt: string
  pickupLocation: string
  destination: string
  customerName: string
  customerContactName: string | null
  customerContactEmail: string | null
  customerContactPhone: string | null
  customerReference: string | null
  plannedPalletQty: number
  actualPalletQty: number | null
  transportCompany: string | null
  driverName: string | null
  driverPhone: string | null
  vehicleNo: string | null
  vehicleType: string | null
  checkedInVehicleNo: string | null
  checkedInDriverName: string | null
  confirmedEta: string | null
  internalRemarks: string | null
  customerRemarks: string | null
  warehouseRemarks: string | null
  loadingCompletedAt: string | null
  items: Array<{
    id: string
    sku: string | null
    description: string
    uom: string
    plannedQty: number
    actualQty: number | null
    varianceReason: string | null
  }>
  deliveryOrders: Array<{ distributionOrder: { id: string; doNumber: string; destination: string; status: string } }>
  palletTransfers: Array<{ id: string; transferNo: string; status: string; movementType: string }>
  statusEvents: Array<{ id: string; fromStatus: string | null; toStatus: string; actorLabel: string | null; remarks: string | null; occurredAt: string }>
  verificationTokens: Array<{ publicCode: string }>
}

type DOOption = { id: string; doNumber: string; destination: string; status: string; distributionDate: string }

const terminal = ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "NO_SHOW"]

const STATUS_PIPELINE = [
  { key: "DRAFT", label: "Draft", desc: "Request created" },
  { key: "AWAITING_CUSTOMER", label: "Link Sent", desc: "Awaiting driver details" },
  { key: "CUSTOMER_SUBMITTED", label: "Driver Registered", desc: "Truck info received" },
  { key: "WAREHOUSE_ACKNOWLEDGED", label: "Acknowledged", desc: "Warehouse verified request" },
  { key: "PREPARING", label: "Preparing", desc: "Goods being staged" },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup", desc: "Awaiting truck arrival" },
  { key: "CHECKED_IN", label: "Checked In", desc: "Gatepost inspection" },
  { key: "LOADING", label: "Loading", desc: "Goods being loaded" },
  { key: "CHECKED_OUT", label: "Checked Out", desc: "Truck departed" },
]

export function GatePassOperations({
  gatePass,
  doOptions,
  availableInventory,
  canWarehouse,
  canRequester,
}: {
  gatePass: GatePassData
  doOptions: DOOption[]
  availableInventory: Array<{ sku: string; batchNumber: string; availableBalance: number }>
  canWarehouse: boolean
  canRequester: boolean
}) {
  const router = useRouter()
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  )
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [customerUrl, setCustomerUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const verificationCode = gatePass.verificationTokens[0]?.publicCode
  const verificationUrl = verificationCode && origin ? `${origin}/public/gatepass/verify/${verificationCode}` : ""

  function run(task: () => Promise<{ success: boolean; error?: string }>, successText: string) {
    setError("")
    setMessage("")
    startTransition(async () => {
      const result = await task()
      if (!result.success) return setError(result.error || "Action failed.")
      setMessage(successText)
      router.refresh()
    })
  }

  function publish() {
    setError("")
    setMessage("")
    startTransition(async () => {
      const result = await publishWarehouseGatePassAction(gatePass.id)
      if (!result.success) return setError(result.error)
      setCustomerUrl(result.data.customerUrl)
      setMessage("Driver form link generated successfully. Share the green 'SHARE WITH CUSTOMER / DRIVER' link/QR below.")
      router.refresh()
    })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function status(toStatus: string, remarks?: string) {
    run(
      () =>
        transitionWarehouseGatePassAction({
          gatePassId: gatePass.id,
          toStatus: toStatus as never,
          actor: "WAREHOUSE",
          remarks,
        }),
      `Status updated to ${toStatus.replaceAll("_", " ")}.`
    )
  }

  function requesterStatus(toStatus: string, remarks: string) {
    run(
      () =>
        transitionWarehouseGatePassAction({
          gatePassId: gatePass.id,
          toStatus: toStatus as never,
          actor: "REQUESTER",
          remarks,
        }),
      `Status updated to ${toStatus.replaceAll("_", " ")}.`
    )
  }

  const nextWarehouseStatus: Record<string, { value: string; label: string; actionText: string }> = {
    CUSTOMER_SUBMITTED: {
      value: "WAREHOUSE_ACKNOWLEDGED",
      label: "Acknowledge Request",
      actionText: "Acknowledging...",
    },
    WAREHOUSE_ACKNOWLEDGED: {
      value: "PREPARING",
      label: "Start Staging Items",
      actionText: "Starting staging...",
    },
    PREPARING: {
      value: "READY_FOR_PICKUP",
      label: "Mark Ready for Pickup",
      actionText: "Updating status...",
    },
    CHECKED_IN: {
      value: "LOADING",
      label: "Start Loading Items",
      actionText: "Recording loading...",
    },
    CHECKED_OUT: {
      value: "COMPLETED",
      label: "Mark Fully Completed",
      actionText: "Closing Gatepass...",
    },
  }

  const next = nextWarehouseStatus[gatePass.status]

  // Pipeline index calculation
  const currentPipelineIdx = STATUS_PIPELINE.findIndex((p) => p.key === gatePass.status)
  const isTerminal = terminal.includes(gatePass.status)

  // Pallet requirement detection
  const palletQty = gatePass.actualPalletQty ?? gatePass.plannedPalletQty
  const hasPallet = palletQty > 0
  const hasPostedPallet = gatePass.palletTransfers.some((p) => p.status === "POSTED")

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-900 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/forms/warehouse/gatepass"
              className="group mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Gatepass List
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{gatePass.gatePassNo}</h1>
              <span className="rounded-full bg-cyan-300/20 border border-cyan-300/40 px-3.5 py-1 text-xs font-black tracking-wider uppercase text-cyan-200">
                {gatePass.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm text-cyan-100/80 font-medium">
              Purpose: <span className="text-white font-semibold">{gatePass.purpose}</span> · Customer:{" "}
              <span className="text-white font-semibold">{gatePass.customerName}</span>
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canRequester && ["DRAFT", "AWAITING_CUSTOMER", "CUSTOMER_SUBMITTED"].includes(gatePass.status) && (
              <TactileButton
                variant="secondary"
                size="md"
                loading={pending}
                loadingText="Generating link..."
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={publish}
                className="bg-cyan-50/90 text-cyan-900 border-cyan-200 hover:bg-cyan-100"
              >
                {gatePass.status === "DRAFT" ? "Generate Customer Link" : "Regenerate Link"}
              </TactileButton>
            )}

            {canRequester && ["DRAFT", "AWAITING_CUSTOMER", "CUSTOMER_SUBMITTED"].includes(gatePass.status) && (
              <TactileButton
                variant="danger"
                size="md"
                disabled={pending}
                onClick={() => {
                  const reason = window.prompt("Please state reason for cancellation:")
                  if (reason) requesterStatus("CANCELLED", reason)
                }}
              >
                Cancel Request
              </TactileButton>
            )}

            {canWarehouse && next && (
              <TactileButton
                variant="emerald"
                size="md"
                loading={pending}
                loadingText={next.actionText}
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => status(next.value)}
              >
                {next.label}
              </TactileButton>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Alerts */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm animate-in fade-in">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}
      {message && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">{message}</div>
        </div>
      )}

      {/* 9-Step Visual Progress Tracker */}
      {!isTerminal && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-700" /> Gatepass Flow Progress
            </h2>
            <span className="text-xs font-bold text-cyan-800">
              Step {Math.max(1, currentPipelineIdx + 1)} of {STATUS_PIPELINE.length}
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-[760px] items-center justify-between relative">
              {/* Connector line */}
              <div className="absolute left-6 right-6 top-4 h-1 bg-slate-100 -z-0" />
              <div
                className="absolute left-6 top-4 h-1 bg-gradient-to-r from-cyan-600 to-emerald-600 transition-all duration-500 -z-0"
                style={{
                  width: `${(Math.max(0, currentPipelineIdx) / (STATUS_PIPELINE.length - 1)) * 100}%`,
                }}
              />

              {STATUS_PIPELINE.map((step, idx) => {
                const isPassed = currentPipelineIdx > idx
                const isCurrent = currentPipelineIdx === idx
                return (
                  <div key={step.key} className="flex flex-col items-center z-10 text-center w-24">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                        isCurrent
                          ? "bg-cyan-700 text-white ring-4 ring-cyan-100 scale-110 shadow-md"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isPassed ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-2 text-[11px] leading-tight font-bold ${
                        isCurrent ? "text-cyan-950 font-black" : isPassed ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Smart Pallet Alert / Action Banner */}
      {hasPallet && !hasPostedPallet && (
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Pallet Ledger Notice
                </div>
                <h3 className="text-base font-black text-amber-950 mt-0.5">
                  {palletQty} Wooden Pallets planned for this shipment
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Pallet ledger record must be created &amp; posted before vehicle can be checked out at the security gate.
                </p>
              </div>
            </div>
            <Link
              href={`/forms/maintenance/pallet-transfer/new?gatepassId=${gatePass.id}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-xs font-black text-white shadow-md hover:bg-amber-800 active:scale-98 transition-all"
            >
              <Layers className="h-4 w-4" /> Record Pallet Movement Now ➔
            </Link>
          </div>
        </div>
      )}

      {/* QR Codes Section: Asymmetric Prominence (Customer 65% vs Security 35%) */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Customer Form Card (Emerald / High Prominence) */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                <Truck className="h-3.5 w-3.5" /> SHARE WITH CUSTOMER / DRIVER
              </span>
              <span className="text-[11px] font-bold text-emerald-800">Public Driver Form</span>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] items-center">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-sm">
                {customerUrl ? (
                  <QRCodeSVG value={customerUrl} size={150} level="H" />
                ) : (
                  <div className="flex h-[150px] w-[150px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center p-3 text-xs text-slate-400">
                    <RefreshCw className="h-6 w-6 mb-2 text-slate-300" />
                    Click button to generate QR
                  </div>
                )}
                <span className="mt-2 text-center text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Driver / Truck QR
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-black text-emerald-950">Customer Transport Form</h3>
                <p className="text-xs font-medium text-emerald-900 leading-relaxed">
                  Driver or customer representative will fill in transporter company, driver name, phone number, vehicle registration number, and estimated arrival time (ETA).
                </p>

                {customerUrl ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-wrap gap-2">
                      <TactileButton
                        variant="emerald"
                        size="sm"
                        icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        onClick={() => copyToClipboard(customerUrl)}
                      >
                        {copied ? "Copied to Clipboard!" : "Copy Customer Link"}
                      </TactileButton>

                      <a
                        href={customerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm hover:bg-emerald-50 active:scale-98 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open Form
                      </a>
                    </div>
                    <input
                      readOnly
                      value={customerUrl}
                      className="w-full rounded-xl border border-emerald-200 bg-white/90 px-3 py-2 text-xs font-mono text-slate-600 select-all"
                    />
                  </div>
                ) : (
                  <div className="pt-2">
                    {canRequester && (
                      <TactileButton
                        variant="emerald"
                        size="md"
                        loading={pending}
                        loadingText="Generating link..."
                        icon={<RefreshCw className="h-4 w-4" />}
                        onClick={publish}
                      >
                        Generate Customer Link &amp; QR Now
                      </TactileButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-emerald-100/60 p-3 text-[11px] font-medium text-emerald-900 flex items-center gap-2">
            <InfoIcon className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>This link is secure and can be accessed on any smartphone without login.</span>
          </div>
        </div>

        {/* Security QR Card (Slate / Amber Accent - Secondary / Read-only) */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-100">
                <ShieldCheck className="h-3 w-3 text-amber-400" /> SECURITY CHECKPOINT
              </span>
              <span className="text-[10px] font-bold text-slate-500">Read-Only</span>
            </div>

            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] font-bold text-amber-900 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>Internal use only — Do not send this QR to customers.</span>
            </div>

            <div className="mt-4 flex flex-col items-center text-center">
              {verificationUrl ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <QRCodeSVG value={verificationUrl} size={120} level="H" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-700">Security Gate Verification QR</p>
                  <p className="mt-1 text-[10px] text-slate-400 font-mono break-all line-clamp-1">
                    {verificationUrl}
                  </p>
                </>
              ) : (
                <div className="py-6 text-xs text-slate-400 text-center">
                  Generate customer link first to activate Security QR.
                </div>
              )}
            </div>
          </div>

          {verificationUrl && (
            <div className="mt-4">
              <Link
                href={`/forms/warehouse/gatepass/security/${verificationCode}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-100 active:scale-98 transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Open Security Gate Screen
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Operational Details */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {/* Movement Plan */}
          <Section title="Movement &amp; Pickup Plan" icon={<Truck className="h-5 w-5 text-cyan-700" />}>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <Info
                label="Requested Pickup Time"
                value={new Date(gatePass.requestedPickupAt).toLocaleString("en-MY", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              />
              <Info
                label="Estimated Arrival (Confirmed ETA)"
                value={
                  gatePass.confirmedEta
                    ? new Date(gatePass.confirmedEta).toLocaleString("en-MY", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Awaiting customer response"
                }
              />
              <Info label="Pickup Location" value={gatePass.pickupLocation} />
              <Info label="Delivery Destination" value={gatePass.destination} />
              <Info label="Customer" value={gatePass.customerName} />
              <Info label="Customer Reference" value={gatePass.customerReference || "—"} />
            </div>
          </Section>

          {/* Transport Details */}
          <Section title="Driver &amp; Truck Information" icon={<Truck className="h-5 w-5 text-cyan-700" />}>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <Info label="Transporter Company" value={gatePass.transportCompany || "Not filled"} />
              <Info label="Driver Name" value={gatePass.driverName || "Not filled"} />
              <Info label="Phone No." value={gatePass.driverPhone || "Not filled"} />
              <Info label="Vehicle Plate No." value={gatePass.vehicleNo || "Not filled"} />
              <Info label="Vehicle Type" value={gatePass.vehicleType || "Not filled"} />
              <Info
                label="Plate at Security Gate"
                value={gatePass.checkedInVehicleNo || "Not checked in"}
              />
            </div>
          </Section>

          {/* Loading Quantities */}
          <Section title="Load &amp; Pallet Quantities" icon={<PackageCheck className="h-5 w-5 text-cyan-700" />}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">SKU / Item</th>
                    <th className="px-4 py-2.5 text-right">Planned</th>
                    <th className="px-4 py-2.5 text-right">Actual</th>
                    <th className="px-4 py-2.5 text-left">Variance Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gatePass.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.description}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.sku || "No SKU"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">
                        {item.plannedQty} {item.uom}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-cyan-800">
                        {item.actualQty ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.varianceReason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 border border-slate-100">
              <Info label="Planned Wooden Pallets" value={`${gatePass.plannedPalletQty} pallets`} />
              <Info
                label="Actual Pallets"
                value={gatePass.actualPalletQty == null ? "Not confirmed yet" : `${gatePass.actualPalletQty} pallets`}
              />
            </div>
          </Section>

          {/* Actuals Form for Warehouse */}
          {canWarehouse && !terminal.includes(gatePass.status) && !["DRAFT", "AWAITING_CUSTOMER"].includes(gatePass.status) && (
            <ActualsForm gatePass={gatePass} pending={pending} run={run} />
          )}
        </div>

        {/* Right Sidebar: Linked Documents & Audit */}
        <div className="space-y-5">
          {/* Linked Documents */}
          <Section title="Linked Documents (DO &amp; Pallet Ledger)" icon={<Link2 className="h-5 w-5 text-cyan-700" />}>
            <div className="space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Delivery Orders (DO)
              </div>
              {gatePass.deliveryOrders.map((link) => (
                <div key={link.distributionOrder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-900 font-mono">{link.distributionOrder.doNumber}</div>
                    <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {link.distributionOrder.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{link.distributionOrder.destination}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/forms/warehouse/trace/do/${link.distributionOrder.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-[11px] font-bold text-cyan-800 hover:bg-cyan-100 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> Traceability
                    </Link>
                    <Link
                      href={`/forms/warehouse/distribution/${link.distributionOrder.id}/pod`}
                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Printer className="h-3 w-3" /> Print DO
                    </Link>
                    {canWarehouse && !["CHECKED_OUT", "COMPLETED"].includes(gatePass.status) && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => unlinkWarehouseGatePassDOAction({ gatePassId: gatePass.id, distributionOrderId: link.distributionOrder.id }), "DO unlinked.")}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                      >Unlink</button>
                    )}
                  </div>
                </div>
              ))}
              {!gatePass.deliveryOrders.length && (
                <p className="text-xs text-slate-400 italic">No DO linked.</p>
              )}

              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 pt-2">
                Pallet Ledger Records
              </div>
              {gatePass.palletTransfers.map((transfer) => (
                <Link
                  key={transfer.id}
                  href={`/forms/maintenance/pallet-transfer/${transfer.id}`}
                  className="block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm hover:bg-amber-100 transition-colors"
                >
                  <div className="font-black text-amber-950">{transfer.transferNo}</div>
                  <div className="text-xs text-amber-800 font-bold">
                    {transfer.movementType.replaceAll("_", " ")} · {transfer.status}
                  </div>
                </Link>
              ))}
              {!gatePass.palletTransfers.length && (
                <p className="text-xs text-slate-400 italic">No pallet records created.</p>
              )}
            </div>

            {canWarehouse && gatePass.loadingCompletedAt && !gatePass.deliveryOrders.length && (
              <CreateDOFromGatePassForm gatePass={gatePass} availableInventory={availableInventory} pending={pending} run={run} />
            )}
            {canWarehouse && <DOLinkForm gatePassId={gatePass.id} options={doOptions} pending={pending} run={run} />}
          </Section>

          {/* Remarks */}
          {(gatePass.internalRemarks || gatePass.customerRemarks || gatePass.warehouseRemarks) && (
            <Section title="Special Instructions &amp; Remarks" icon={<InfoIcon className="h-5 w-5 text-cyan-700" />}>
              <Info label="Internal Remarks" value={gatePass.internalRemarks || "—"} />
              <Info label="Customer Remarks" value={gatePass.customerRemarks || "—"} />
              <Info label="Warehouse Remarks" value={gatePass.warehouseRemarks || "—"} />
            </Section>
          )}

          {/* Audit Timeline */}
          <Section title="Audit Timeline" icon={<RefreshCw className="h-5 w-5 text-cyan-700" />}>
            <ol className="space-y-3.5 border-l-2 border-cyan-200 pl-4">
              {gatePass.statusEvents.map((event) => (
                <li key={event.id} className="relative">
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-700 ring-4 ring-white" />
                  <div className="text-xs font-black text-slate-900">{event.toStatus.replaceAll("_", " ")}</div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {new Date(event.occurredAt).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                    {event.actorLabel || "System"}
                  </div>
                  {event.remarks && <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">{event.remarks}</p>}
                </li>
              ))}
            </ol>
          </Section>

          {/* Warehouse Rejection & No-Show Controls */}
          {canWarehouse &&
            ["CUSTOMER_SUBMITTED", "WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP"].includes(
              gatePass.status
            ) && (
              <div className="space-y-2 pt-2">
                <TactileButton
                  variant="danger"
                  fullWidth
                  disabled={pending}
                  onClick={() => {
                    const reason = window.prompt("Please state the reason for rejecting Gatepass:")
                    if (reason) status("REJECTED", reason)
                  }}
                >
                  Reject Gatepass
                </TactileButton>

                {["WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP"].includes(gatePass.status) && (
                  <TactileButton
                    variant="amber"
                    fullWidth
                    disabled={pending}
                    onClick={() => {
                      const remarks = window.prompt("Remarks for vehicle no-show:")
                      if (remarks) status("NO_SHOW", remarks)
                    }}
                  >
                    Mark as No-Show
                  </TactileButton>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

function ActualsForm({
  gatePass,
  pending,
  run,
}: {
  gatePass: GatePassData
  pending: boolean
  run: (task: () => Promise<{ success: boolean; error?: string }>, success: string) => void
}) {
  const [actualPalletQty, setActualPalletQty] = useState(gatePass.actualPalletQty ?? gatePass.plannedPalletQty)
  const [remarks, setRemarks] = useState(gatePass.warehouseRemarks || "")
  const [items, setItems] = useState(
    gatePass.items.map((item) => ({
      id: item.id,
      actualQty: item.actualQty ?? item.plannedQty,
      varianceReason: item.varianceReason || "",
    }))
  )

  return (
    <Section title="Warehouse Actual Quantity Verification" icon={<PackageCheck className="h-5 w-5 text-cyan-700" />}>
      <div className="space-y-3.5">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-2 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-[1fr_140px] border border-slate-200">
            <div className="text-xs font-bold text-slate-700">
              {gatePass.items[index].description}
              <input
                value={item.varianceReason}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((row) => (row.id === item.id ? { ...row, varianceReason: event.target.value } : row))
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                placeholder="Reason for quantity variance (required if different)"
              />
            </div>
            <input
              aria-label={`Actual Quantity ${gatePass.items[index].description}`}
              type="number"
              min="0"
              value={item.actualQty}
              onChange={(event) =>
                setItems((current) =>
                  current.map((row) => (row.id === item.id ? { ...row, actualQty: Number(event.target.value) } : row))
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-right font-black text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 text-base"
            />
          </div>
        ))}

        <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
          Actual Pallet Quantity
          <input
            type="number"
            min="0"
            value={actualPalletQty}
            onChange={(event) => setActualPalletQty(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
          Warehouse Remarks / Pallet Variance Reason
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            placeholder="Staging notes or cargo variance reason..."
          />
        </label>

        <div className={`grid gap-2.5 pt-2 ${gatePass.status === "LOADING" ? "sm:grid-cols-2" : ""}`}>
          <TactileButton
            variant="secondary"
            loading={pending}
            loadingText="Saving quantities..."
            onClick={() =>
              run(
                () =>
                  updateWarehouseGatePassActualsAction({
                    gatePassId: gatePass.id,
                    actualPalletQty,
                    warehouseRemarks: remarks,
                    items,
                  }),
                "Actual quantities saved successfully."
              )
            }
          >
            Save Actual Quantities
          </TactileButton>

          {gatePass.status === "LOADING" && (
            <TactileButton
              variant="emerald"
              loading={pending}
              loadingText="Confirming loading completed..."
              onClick={() =>
                run(
                  () =>
                    updateWarehouseGatePassActualsAction({
                      gatePassId: gatePass.id,
                      actualPalletQty,
                      warehouseRemarks: remarks,
                      loadingCompleted: true,
                      items,
                    }),
                  "Loading confirmed completed. Security may now check out the truck after verifying DO & Pallets."
                )
              }
            >
              Confirm Loading Completed
            </TactileButton>
          )}
        </div>
      </div>
    </Section>
  )
}

function DOLinkForm({
  gatePassId,
  options,
  pending,
  run,
}: {
  gatePassId: string
  options: DOOption[]
  pending: boolean
  run: (task: () => Promise<{ success: boolean; error?: string }>, success: string) => void
}) {
  const [id, setId] = useState("")

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
        Link Existing DO
        <select
          value={id}
          onChange={(event) => setId(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">— Select Delivery Order —</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.doNumber} — {option.destination}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3">
        <TactileButton
          variant="dark"
          fullWidth
          disabled={!id || pending}
          loading={pending}
          loadingText="Linking DO..."
          onClick={() =>
            run(
              () => linkWarehouseGatePassDOAction({ gatePassId, distributionOrderId: id }),
              "Delivery Order linked successfully."
            )
          }
        >
          Link Existing DO
        </TactileButton>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        This link is for verification reference only. It does not alter existing DO status.
      </p>
    </div>
  )
}

function CreateDOFromGatePassForm({
  gatePass, availableInventory, pending, run,
}: {
  gatePass: GatePassData
  availableInventory: Array<{ sku: string; batchNumber: string; availableBalance: number }>
  pending: boolean
  run: (task: () => Promise<{ success: boolean; error?: string }>, success: string) => void
}) {
  const eligible = gatePass.items.filter(item => item.sku && (item.actualQty ?? item.plannedQty) > 0)
  // This component only appears once Warehouse confirms loading; opening immediately prevents
  // staff from forgetting the required DO while still allowing them to cancel and return later.
  const [open, setOpen] = useState(true)
  const [batches, setBatches] = useState<Record<string, string>>({})
  if (!eligible.length) return <p className="mt-4 text-xs text-red-600">SKU and actual quantity are required before a DO can be created.</p>
  return (
    <div className="mt-4 border-t border-emerald-100 pt-4">
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-800">
        Create DO from Gatepass Actuals
      </button>
      <p className="mt-2 text-[11px] text-slate-500">Destination, driver, vehicle, and actual quantity will be copied. Select stock batch before confirming.</p>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-950">Create DO — {gatePass.gatePassNo}</h3>
            <p className="mt-1 text-sm text-slate-600">{gatePass.destination} · {gatePass.driverName || "No driver"} · {gatePass.vehicleNo || "No vehicle"}</p>
            <div className="mt-5 space-y-3">
              {eligible.map((item) => {
                const key = item.id
                const options = availableInventory.filter(batch => batch.sku === item.sku)
                return <label key={key} className="block rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700">
                  <span className="block">{item.description} — {item.actualQty ?? item.plannedQty} {item.uom}</span>
                  <select value={batches[key] || ""} onChange={event => setBatches(current => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2">
                    <option value="">— Select batch {item.sku} —</option>
                    {options.map(batch => <option key={batch.batchNumber} value={batch.batchNumber}>{batch.batchNumber} (balance {batch.availableBalance})</option>)}
                  </select>
                </label>
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button type="button" disabled={pending || eligible.some(item => !batches[item.id])} onClick={() => run(
                () => createWarehouseGatePassDOAction({ gatePassId: gatePass.id, items: eligible.map(item => ({ sku: item.sku!, batchNumber: batches[item.id], qtySent: item.actualQty ?? item.plannedQty })) }),
                "DO created and linked to Gatepass successfully."
              )} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Confirm & Create DO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 font-black text-slate-900">
        {icon}
        <h3 className="text-base font-black">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="whitespace-pre-wrap font-bold text-slate-800 text-sm mt-0.5">{value}</div>
    </div>
  )
}
