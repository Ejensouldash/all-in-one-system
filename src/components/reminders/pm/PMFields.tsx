"use client"

import { Plus, Trash2 } from "lucide-react"
import type { PMInput, PMUser } from "@/lib/reminders/pm-core"

export const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
export const buttonClass = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"

export function PICPicker({ ids, users, onChange }: { ids: string[]; users: PMUser[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="max-h-40 space-y-1 overflow-auto rounded-lg border bg-white p-2">
      {users.map((user) => (
        <label
          key={user.id}
          className={`flex items-start gap-2 p-1 text-sm ${!user.eligible ? "text-red-700" : "text-slate-700"}`}
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={ids.includes(user.id)}
            disabled={!user.eligible}
            onChange={(e) =>
              onChange(e.target.checked ? [...ids, user.id] : ids.filter((id) => id !== user.id))
            }
          />
          <span>
            {user.name} <span className="text-xs text-slate-500">{user.email}</span>
            {!user.eligible && " — Tiada akses Reminders"}
          </span>
        </label>
      ))}
    </div>
  )
}

export function PMFields({
  value,
  users,
  onChange,
}: {
  value: PMInput
  users: PMUser[]
  onChange: (value: PMInput) => void
}) {
  const checklist = value.checklist.length > 0 ? value.checklist : [""]

  const updateItem = (index: number, text: string) => {
    const updated = [...checklist]
    updated[index] = text
    onChange({ ...value, checklist: updated })
  }

  const addItem = () => {
    onChange({ ...value, checklist: [...checklist, ""] })
  }

  const removeItem = (index: number) => {
    if (checklist.length <= 1) {
      onChange({ ...value, checklist: [""] })
      return
    }
    const updated = checklist.filter((_, i) => i !== index)
    onChange({ ...value, checklist: updated })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">
        Equipment
        <input
          required
          maxLength={200}
          className={fieldClass}
          value={value.equipment}
          onChange={(e) => onChange({ ...value, equipment: e.target.value })}
        />
      </label>

      <label className="text-sm font-medium">
        SRS (pilihan)
        <input
          maxLength={120}
          className={fieldClass}
          value={value.srs || ""}
          onChange={(e) => onChange({ ...value, srs: e.target.value || null })}
        />
      </label>

      <label className="text-sm font-medium">
        Tarikh mula ulangan
        <input
          required
          type="date"
          className={fieldClass}
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </label>

      <label className="text-sm font-medium">
        Kekerapan
        <select
          className={fieldClass}
          value={`${value.intervalUnit}:${value.intervalCount}`}
          onChange={(e) => {
            const [intervalUnit, count] = e.target.value.split(":")
            onChange({ ...value, intervalUnit, intervalCount: Number(count) })
          }}
        >
          <option value="DAY:14">2 minggu</option>
          <option value="MONTH:1">Bulanan</option>
          <option value="MONTH:2">2 bulan</option>
          <option value="MONTH:3">3 bulan</option>
          <option value="MONTH:6">6 bulan</option>
          <option value="MONTH:12">Tahunan</option>
        </select>
      </label>

      {/* Dynamic Checklist Section */}
      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-900">
            Senarai Arahan Kerja / Checklist SOP
          </label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Arahan Kerja
          </button>
        </div>

        <div className="space-y-2">
          {checklist.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                {index + 1}
              </span>
              <input
                type="text"
                required
                maxLength={500}
                placeholder={`Arahan kerja ${index + 1} (cth: Check Engine Oil & Filter)`}
                className={fieldClass}
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                title="Padam arahan ini"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium">PIC tetap — pilih akaun AIO secara jelas (pilihan)</p>
        <PICPicker ids={value.picIds} users={users} onChange={(picIds) => onChange({ ...value, picIds })} />
      </div>
    </div>
  )
}
