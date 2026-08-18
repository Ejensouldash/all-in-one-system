import type { Metadata } from "next"
import { getExternalGatePass } from "@/lib/warehouse/gatepass-service"
import { ExternalGatePassForm } from "./ExternalGatePassForm"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "BubblesO2 Gatepass Confirmation",
  robots: { index: false, follow: false, nocache: true },
}

export default async function ExternalGatePassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const record = await getExternalGatePass(token)
  if (!record) return <PublicShell><div className="rounded-2xl border border-red-200 bg-red-50 p-6"><h1 className="text-xl font-black text-red-900">Link unavailable</h1><p className="mt-2 text-sm text-red-700">This secure link is invalid, expired or has been replaced. Please contact the BubblesO2 PIC for a new link.</p></div></PublicShell>

  const data = {
    alreadySubmitted: record.alreadySubmitted,
    expiresAt: record.expiresAt.toISOString(),
    gatePass: {
      ...record.gatePass,
      requestedPickupAt: record.gatePass.requestedPickupAt.toISOString(),
      confirmedEta: record.gatePass.confirmedEta?.toISOString() || null,
    },
  }
  return <PublicShell><ExternalGatePassForm token={token} data={data} /></PublicShell>
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#cffafe,_transparent_35%),linear-gradient(135deg,#f8fafc,#ecfeff)] px-4 py-8"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center justify-between"><div><div className="text-2xl font-black tracking-tight text-slate-950">BubblesO2</div><div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-700">AIO Gatepass</div></div><div className="rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-bold text-cyan-800">Secure external form</div></div>{children}<p className="mt-6 text-center text-xs text-slate-500">Only transport and driver details are collected. No AIO account is required.</p></div></main>
}
