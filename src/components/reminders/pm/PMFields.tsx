"use client"

import type { PMInput, PMUser } from "@/lib/reminders/pm-core"

export const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
export const buttonClass = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
export function PICPicker({ ids, users, onChange }: { ids: string[]; users: PMUser[]; onChange: (ids: string[]) => void }) {
  return <div className="max-h-40 space-y-1 overflow-auto rounded-lg border bg-white p-2">
    {users.map(user => <label key={user.id} className={`flex items-start gap-2 p-1 text-sm ${!user.eligible ? "text-red-700" : "text-slate-700"}`}>
      <input type="checkbox" className="mt-1" checked={ids.includes(user.id)} disabled={!user.eligible} onChange={e => onChange(e.target.checked ? [...ids, user.id] : ids.filter(id => id !== user.id))} />
      <span>{user.name} <span className="text-xs text-slate-500">{user.email}</span>{!user.eligible && " — Tiada akses Reminders"}</span>
    </label>)}
  </div>
}
export function PMFields({ value, users, onChange }: { value: PMInput; users: PMUser[]; onChange: (value: PMInput) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-medium">Equipment<input required maxLength={200} className={fieldClass} value={value.equipment} onChange={e => onChange({ ...value, equipment: e.target.value })} /></label>
    <label className="text-sm font-medium">SRS (pilihan)<input maxLength={120} className={fieldClass} value={value.srs || ""} onChange={e => onChange({ ...value, srs: e.target.value || null })} /></label>
    <label className="text-sm font-medium">Tarikh mula ulangan<input required type="date" className={fieldClass} value={value.startDate} onChange={e => onChange({ ...value, startDate: e.target.value })} /></label>
    <label className="text-sm font-medium">Kekerapan<select className={fieldClass} value={`${value.intervalUnit}:${value.intervalCount}`} onChange={e => { const [intervalUnit, count] = e.target.value.split(":"); onChange({ ...value, intervalUnit, intervalCount: Number(count) }) }}>
      <option value="DAY:14">2 minggu</option><option value="MONTH:1">Bulanan</option><option value="MONTH:2">2 bulan</option><option value="MONTH:3">3 bulan</option><option value="MONTH:6">6 bulan</option><option value="MONTH:12">Tahunan</option>
    </select></label>
    <label className="text-sm font-medium sm:col-span-2">Arahan kerja / checklist (satu setiap baris)<textarea required rows={3} className={fieldClass} value={value.checklist.join("\n")} onChange={e => onChange({ ...value, checklist: e.target.value.split("\n") })} /></label>
    <div className="sm:col-span-2"><p className="mb-1 text-sm font-medium">PIC tetap — pilih akaun AIO secara jelas</p><PICPicker ids={value.picIds} users={users} onChange={picIds => onChange({ ...value, picIds })} /></div>
  </div>
}
