import type { Metadata } from "next"
import { ShieldCheck, Truck } from "lucide-react"
import { getVerificationGatePass } from "@/lib/warehouse/gatepass-service"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Verify BubblesO2 Gatepass", robots: { index: false, follow: false, nocache: true } }

export default async function VerifyGatePassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const gatePass = await getVerificationGatePass(code)
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10"><div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">{gatePass ? <><ShieldCheck className="h-12 w-12 text-emerald-600" /><div className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Valid BubblesO2 record</div><h1 className="mt-1 text-3xl font-black text-slate-950">{gatePass.gatePassNo}</h1><div className="mt-5 rounded-2xl bg-slate-50 p-5"><div className="text-xs font-black uppercase text-slate-400">Current status</div><div className="mt-1 text-xl font-black text-cyan-800">{gatePass.status.replaceAll("_", " ")}</div><div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700"><Truck className="h-4 w-4" /> {gatePass.vehicleNo || "Vehicle pending"}</div><div className="mt-2 text-sm text-slate-600">Pickup: {gatePass.requestedPickupAt.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</div></div><p className="mt-4 text-xs text-slate-500">This public verification page is read-only and intentionally excludes customer, item and contact details.</p></> : <><div className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Not verified</div><h1 className="mt-2 text-2xl font-black text-slate-950">Gatepass QR is invalid or revoked</h1><p className="mt-3 text-sm text-slate-600">Ask the BubblesO2 PIC to provide the current Gatepass QR.</p></>}</div></main>
}
