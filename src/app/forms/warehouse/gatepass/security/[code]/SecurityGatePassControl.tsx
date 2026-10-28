"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Layers,
  LogIn,
  LogOut,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  XCircle,
} from "lucide-react"
import { transitionWarehouseGatePassAction } from "@/app/actions/warehouse-gatepass"
import { TactileButton } from "@/components/ui/TactileButton"

type Data = {
  id: string
  gatePassNo: string
  status: string
  requestedPickupAt: string
  pickupLocation: string
  destination: string
  customerName: string
  transportCompany: string | null
  driverName: string | null
  driverPhone: string | null
  vehicleNo: string | null
  vehicleType: string | null
  checkedInVehicleNo: string | null
  checkedInDriverName: string | null
  checkedInAt: string | null
  loadingCompletedAt: string | null
  checkedOutAt: string | null
  plannedPalletQty: number
  actualPalletQty: number | null
  items: Array<{ id: string; description: string; sku: string | null; uom: string; plannedQty: number; actualQty: number | null }>
  deliveryOrders: Array<{ id: string; doNumber: string }>
}

export function SecurityGatePassControl({ gatePass }: { gatePass: Data }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [vehicleNo, setVehicleNo] = useState(gatePass.checkedInVehicleNo || gatePass.vehicleNo || "")
  const [driverName, setDriverName] = useState(gatePass.checkedInDriverName || gatePass.driverName || "")
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  function transition(toStatus: "CHECKED_IN" | "CHECKED_OUT" | "REJECTED") {
    setError("")
    setMessage("")
    startTransition(async () => {
      const result = await transitionWarehouseGatePassAction({
        gatePassId: gatePass.id,
        toStatus,
        actor: "SECURITY",
        remarks,
        observedVehicleNo: vehicleNo,
        observedDriverName: driverName,
      })
      if (!result.success) return setError(result.error)
      setMessage(
        toStatus === "CHECKED_IN"
          ? "Vehicle Check-In recorded successfully."
          : toStatus === "CHECKED_OUT"
          ? "Vehicle Check-Out recorded successfully."
          : "Gatepass entry rejection recorded successfully."
      )
      router.refresh()
    })
  }

  const canReject = [
    "CUSTOMER_SUBMITTED",
    "WAREHOUSE_ACKNOWLEDGED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "CHECKED_IN",
  ].includes(gatePass.status)

  // Mismatch detection between registered & observed
  const registeredVehicle = (gatePass.vehicleNo || "").trim().toUpperCase()
  const observedVehicle = vehicleNo.trim().toUpperCase()
  const hasVehicleMismatch = registeredVehicle !== "" && observedVehicle !== "" && registeredVehicle !== observedVehicle

  const registeredDriver = (gatePass.driverName || "").trim().toLowerCase()
  const observedDriver = driverName.trim().toLowerCase()
  const hasDriverMismatch = registeredDriver !== "" && observedDriver !== "" && registeredDriver !== observedDriver

  const totalBoxesPlanned = gatePass.items.reduce((sum, item) => sum + item.plannedQty, 0)
  const totalBoxesActual = gatePass.items.reduce((sum, item) => sum + (item.actualQty || 0), 0)
  const palletCount = gatePass.actualPalletQty ?? gatePass.plannedPalletQty

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/forms/warehouse/gatepass/security"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Scan Another Code
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-slate-950">{gatePass.gatePassNo}</h1>
            <span className="rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1 text-xs font-black text-amber-950 uppercase tracking-wider">
              {gatePass.status.replaceAll("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Alerts */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm animate-in fade-in">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-red-800">Action Blocked:</div>
            <div className="mt-1 font-medium">{error}</div>

            {/* Smart Pallet / DO guidance if error mentions pallet or DO */}
            {error.toLowerCase().includes("pallet") && (
              <div className="mt-3">
                <Link
                  href={`/forms/maintenance/pallet-transfer/new?gatepassId=${gatePass.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-black text-white hover:bg-amber-800"
                >
                  <Layers className="h-4 w-4" /> Open Pallet Ledger Record
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">{message}</div>
        </div>
      )}

      {/* Mismatch Warning Alert Banner */}
      {(hasVehicleMismatch || hasDriverMismatch) && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-900">
              Warning: Physical Discrepancy Detected
            </div>
            <div className="text-xs text-amber-800 mt-0.5">
              {hasVehicleMismatch && (
                <div>
                  • Registered license plate (<strong>{gatePass.vehicleNo}</strong>) differs from physical gate observation (<strong>{vehicleNo}</strong>).
                </div>
              )}
              {hasDriverMismatch && (
                <div>
                  • Registered driver name (<strong>{gatePass.driverName}</strong>) differs from attending driver (<strong>{driverName}</strong>).
                </div>
              )}
              Please ensure the discrepancy reason is stated in the remarks field below before proceeding.
            </div>
          </div>
        </div>
      )}

      {/* Split Verification Layout: Registered vs Physical Observation */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left Column: Registered Data */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <Truck className="h-5 w-5 text-cyan-700" /> Driver &amp; Truck Registration Data
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Info label="Pickup Time" value={new Date(gatePass.requestedPickupAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })} />
              <Info label="Customer" value={gatePass.customerName} />
              <Info label="Registered Plate No." value={gatePass.vehicleNo || "Not provided"} isHighlight={hasVehicleMismatch} />
              <Info label="Vehicle Type" value={gatePass.vehicleType || "—"} />
              <Info label="Registered Driver Name" value={gatePass.driverName || "Not provided"} isHighlight={hasDriverMismatch} />
              <Info label="Phone No." value={gatePass.driverPhone || "—"} />
              <Info label="Destination" value={gatePass.destination} />
              <Info label="Linked DO" value={gatePass.deliveryOrders.map((order) => order.doNumber).join(", ") || "Not linked"} />
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <span>Planned Load:</span>
              <span className="font-bold text-slate-900">{totalBoxesPlanned} units/boxes · {gatePass.plannedPalletQty} pallets</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Actual Load (Warehouse):</span>
              <span className="font-bold text-cyan-800">
                {gatePass.loadingCompletedAt ? `${totalBoxesActual} units/boxes · ${gatePass.actualPalletQty ?? "—"} pallets` : "Not confirmed yet"}
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: Physical Gate Observation & Action */}
        <section className="rounded-3xl border-2 border-amber-300 bg-amber-50/50 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-amber-950">
              <ShieldAlert className="h-5 w-5 text-amber-700" /> Security Guard Physical Observation
            </h2>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Actual Vehicle Plate No. (Physical)
                <input
                  value={vehicleNo}
                  onChange={(event) => setVehicleNo(event.target.value.toUpperCase())}
                  className={`mt-1.5 w-full rounded-2xl border px-3.5 py-3 text-base font-black uppercase font-mono tracking-wider outline-none transition-all ${
                    hasVehicleMismatch ? "border-amber-500 bg-amber-100/50 text-amber-950 focus:ring-amber-200" : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-100"
                  }`}
                  style={{ textTransform: "uppercase" }}
                />
              </label>

              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Actual Driver Name (IC / License)
                <input
                  value={driverName}
                  onChange={(event) => setDriverName(event.target.value)}
                  className={`mt-1.5 w-full rounded-2xl border px-3.5 py-3 text-sm font-semibold outline-none transition-all ${
                    hasDriverMismatch ? "border-amber-500 bg-amber-100/50 text-amber-950 focus:ring-amber-200" : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-100"
                  }`}
                />
              </label>

              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Security Remarks / Discrepancy Reason
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={2}
                  placeholder={hasVehicleMismatch || hasDriverMismatch ? "State reason for plate/driver discrepancy..." : "Additional security remarks (if any)..."}
                  className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            </div>
          </div>

          {/* Giant Touch Target Action Buttons (52px+) */}
          <div className="mt-6 space-y-2.5">
            {gatePass.status === "READY_FOR_PICKUP" && (
              <TactileButton
                variant="amber"
                size="xl"
                fullWidth
                loading={pending}
                loadingText="Recording Check-In..."
                icon={<LogIn className="h-5 w-5" />}
                onClick={() => transition("CHECKED_IN")}
              >
                Record Vehicle Check-In
              </TactileButton>
            )}

            {gatePass.status === "LOADING" && (
              <TactileButton
                variant="emerald"
                size="xl"
                fullWidth
                loading={pending}
                loadingText="Recording Check-Out..."
                icon={<LogOut className="h-5 w-5" />}
                onClick={() => transition("CHECKED_OUT")}
              >
                Record Vehicle Check-Out
              </TactileButton>
            )}

            {gatePass.status === "CHECKED_OUT" && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 border border-emerald-300 p-4 text-sm font-black text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" /> Vehicle Successfully Checked Out
              </div>
            )}

            {canReject && (
              <TactileButton
                variant="danger"
                size="sm"
                fullWidth
                disabled={pending || !remarks.trim()}
                onClick={() => transition("REJECTED")}
              >
                Deny Entry (Remarks Required)
              </TactileButton>
            )}
          </div>
        </section>
      </div>

      {/* Operational Rules Card */}
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 text-xs text-cyan-950 space-y-1">
        <div className="font-bold flex items-center gap-1.5 text-cyan-900">
          <ShieldCheck className="h-4 w-4 text-cyan-700 shrink-0" /> Gatepost Security Rules:
        </div>
        <p>
          1. <strong>Check-In:</strong> Confirm physical plate number before opening the entry barrier.
        </p>
        <p>
          2. <strong>Check-Out:</strong> Requires loading confirmation from Warehouse, at least 1 linked DO, and a posted pallet ledger record if pallets were used.
        </p>
      </div>
    </div>
  )
}

function Info({ label, value, isHighlight }: { label: string; value: string; isHighlight?: boolean }) {
  return (
    <div className={`p-2 rounded-xl transition-colors ${isHighlight ? "bg-amber-100/60 border border-amber-300" : ""}`}>
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`font-bold text-sm mt-0.5 ${isHighlight ? "text-amber-950 font-black" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  )
}
