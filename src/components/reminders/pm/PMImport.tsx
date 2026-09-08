"use client"

import { useState } from "react"
import { confirmPMImport, previewPMImport } from "@/app/actions/reminder-pm"
import { datesBetween, occurrenceDate, validRule, type PMGroup, type PMUser } from "@/lib/reminders/pm-core"
import { PMFields, buttonClass, fieldClass } from "./PMFields"

export function PMImport({ users, today, schedules, onDone }: { users: PMUser[]; today: string; schedules: { id: string; equipment: string; srs: string | null; archivedAt: Date | null }[]; onDone: () => void }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewPMImport>> | null>(null)
  const [groups, setGroups] = useState<PMGroup[]>([])
  const [activation, setActivation] = useState(today)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function upload(form: FormData) {
    setBusy(true); setError("")
    try { const result = await previewPMImport(form); setPreview(result); setGroups(result.groups) }
    catch (e) { setError(e instanceof Error ? e.message : "Import gagal.") }
    finally { setBusy(false) }
  }
  function split(index: number) {
    const group = groups[index]
    const tasks = [...new Set(group.sourceRows.map(r => r.task))]
    const parts = tasks.map((task, i) => {
      const sourceRows = group.sourceRows.filter(r => r.task === task)
      return { ...group, sourceKey: `${group.sourceKey.split(":")[0]}:${i}-${sourceRows[0].row}`, sourceRows, checklist: [task], startDate: sourceRows.map(r => r.date).sort()[0], targetId: undefined, reviewed: false }
    })
    setGroups([...groups.slice(0, index), ...parts, ...groups.slice(index + 1)])
  }
  async function confirm() {
    if (!preview) return
    setBusy(true); setError("")
    try { await confirmPMImport(preview.id, groups, activation); onDone() }
    catch (e) { setError(e instanceof Error ? e.message : "Pengaktifan gagal.") }
    finally { setBusy(false) }
  }
  return <div className="space-y-5">
    <p className="text-sm text-slate-600">Baca Excel → semak kumpulan → padankan PIC → pratonton → aktifkan. Tiada e-mel dihantar ketika import.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    <form action={upload} className="flex flex-wrap gap-3"><input aria-label="Fail Excel SGMP-03" name="file" type="file" accept=".xlsx" required className={fieldClass} /><button disabled={busy} className={buttonClass}>{busy ? "Membaca…" : "Baca Excel"}</button></form>
    {preview && <>
      <div className="rounded-xl bg-amber-50 p-4"><strong>{preview.fileName}: {preview.rowCount} baris → {groups.length} kumpulan</strong><p className="mt-1 text-sm">Tarikh sebelum pengaktifan disimpan sebagai rujukan sahaja. Jadual berterusan selepas 2026. Untuk fail semakan, pilih jadual sedia ada yang hendak dikemas kini.</p></div>
      <label className="block text-sm font-medium">Tarikh pengaktifan jadual baharu<input type="date" min={today} value={activation} onChange={e => setActivation(e.target.value)} className={fieldClass} /></label>
      {groups.map((group, index) => {
        const range = group.sourceRows.map(r => r.date).sort()
        const calculated = validRule(group) ? new Set(datesBetween(group, range[0], range[range.length - 1])) : new Set<string>()
        return <section key={group.sourceKey} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{index + 1}. {group.equipment} · {group.sourceRows.length} baris</h3>{new Set(group.sourceRows.map(r => r.task)).size > 1 && <button type="button" onClick={() => split(index)} className="text-sm font-semibold text-indigo-700 underline">Pecahkan mengikut arahan asal</button>}</div>
          <p className="text-sm text-slate-600">PIC asal: {[...new Set(group.sourceRows.map(r => r.pic))].join(" · ")}</p>
          <PMFields value={group} users={users} onChange={value => setGroups(groups.map((g, i) => i === index ? { ...g, ...value, reviewed: false } : g))} />
          <label className="block text-sm">Tindakan import<select className={fieldClass} value={group.targetId || ""} onChange={e => setGroups(groups.map((g, i) => i === index ? { ...g, targetId: e.target.value || undefined, reviewed: false } : g))}><option value="">Jadual baharu / padanan sumber automatik</option>{schedules.filter(s => !s.archivedAt).map(s => <option key={s.id} value={s.id}>Kemas kini: {s.equipment} {s.srs || ""} ({s.id.slice(0, 6)})</option>)}</select></label>
          <p className="text-sm"><strong>Ulangan dikira:</strong> {validRule(group) ? Array.from({ length: 6 }, (_, i) => occurrenceDate(group, i)).join(" → ") : "Semak tarikh mula"}</p>
          <details><summary className="cursor-pointer text-sm font-semibold text-indigo-700">Semak baris asal, variasi dan perbezaan tarikh</summary><div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th>Baris</th><th>Tarikh Excel</th><th>Equipment / SRS</th><th>Arahan / PIC</th><th>Dalam ulangan?</th></tr></thead><tbody>{group.sourceRows.map(row => <tr key={`${row.sheet}:${row.row}`} className="border-t"><td className="p-2">{row.sheet}:{row.row}</td><td>{row.date}</td><td>{row.equipment}<br />{row.srs}</td><td>{row.task}<br />{row.pic}</td><td className={calculated.has(row.date) ? "text-green-700" : "text-amber-800"}>{calculated.has(row.date) ? "Ya" : "Berbeza"}</td></tr>)}</tbody></table></div></details>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={group.reviewed} onChange={e => setGroups(groups.map((g, i) => i === index ? { ...g, reviewed: e.target.checked } : g))} />Saya sahkan arahan, tarikh mula, PIC dan tindakan kumpulan ini.</label>
        </section>
      })}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-white p-3"><span className="text-sm">{groups.filter(g => g.reviewed).length}/{groups.length} kumpulan disahkan</span><button disabled={busy || groups.some(g => !g.reviewed)} className={buttonClass} onClick={confirm}>{busy ? "Menyimpan…" : "Aktifkan jadual yang disahkan"}</button></div>
    </>}
  </div>
}
