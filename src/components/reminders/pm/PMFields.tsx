"use client"

import { useState } from "react"
import { Plus, Trash2, Lock, Sparkles, Check, X } from "lucide-react"
import { convertDurationToWeeks, STANDARD_WEEK_INTERVALS, type PMInput, type PMUser } from "@/lib/reminders/pm-core"

export const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
export const buttonClass = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"

export function PICPicker({ ids, users, onChange }: { ids: string[]; users: PMUser[]; onChange: (ids: string[]) => void }) {
  // Only display users who have access to the Reminders module
  const eligibleUsers = users.filter((user) => user.eligible)

  if (eligibleUsers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
        No staff members currently have access to the Reminders module.
      </div>
    )
  }

  return (
    <div className="max-h-48 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
      {eligibleUsers.map((user) => (
        <label
          key={user.id}
          className="flex items-center gap-2.5 rounded-lg p-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={ids.includes(user.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...ids, user.id] : ids.filter((id) => id !== user.id))
            }
          />
          <span className="font-semibold text-slate-900">{user.name}</span>
          <span className="text-[11px] text-slate-400">{user.email}</span>
        </label>
      ))}
    </div>
  )
}

export function PMFields({
  value,
  users,
  onChange,
  canEditFrequency = true,
  canEditWork = true,
}: {
  value: PMInput
  users: PMUser[]
  onChange: (value: PMInput) => void
  canEditFrequency?: boolean
  canEditWork?: boolean
}) {
  const [showConverter, setShowConverter] = useState(false)
  const [converterAmount, setConverterAmount] = useState<number>(30)
  const [converterUnit, setConverterUnit] = useState<"DAY" | "MONTH">("DAY")

  const checklist = value.checklist.length > 0 ? value.checklist : [""]

  const updateItem = (index: number, text: string) => {
    if (!canEditWork) return
    const updated = [...checklist]
    updated[index] = text
    onChange({ ...value, checklist: updated })
  }

  const addItem = () => {
    if (!canEditWork) return
    onChange({ ...value, checklist: [...checklist, ""] })
  }

  const removeItem = (index: number) => {
    if (!canEditWork) return
    if (checklist.length <= 1) {
      onChange({ ...value, checklist: [""] })
      return
    }
    const updated = checklist.filter((_, i) => i !== index)
    onChange({ ...value, checklist: updated })
  }

  const handleApplyConverter = () => {
    const result = convertDurationToWeeks(converterAmount, converterUnit)
    onChange({ ...value, intervalUnit: result.intervalUnit, intervalCount: result.intervalCount })
    setShowConverter(false)
  }

  const previewConverted = convertDurationToWeeks(converterAmount, converterUnit)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">
        Equipment Name
        <input
          required
          maxLength={200}
          className={fieldClass}
          value={value.equipment}
          onChange={(e) => onChange({ ...value, equipment: e.target.value })}
        />
      </label>

      <label className="text-sm font-medium">
        SRS Number (Optional)
        <input
          maxLength={120}
          className={fieldClass}
          value={value.srs || ""}
          onChange={(e) => onChange({ ...value, srs: e.target.value || null })}
        />
      </label>

      <label className="text-sm font-medium">
        Recurrence Start Date
        <input
          required
          type="date"
          className={fieldClass}
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </label>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Frequency (Recurrence)
            {!canEditFrequency && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </label>
          {canEditFrequency && (
            <button
              type="button"
              onClick={() => setShowConverter(!showConverter)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {showConverter ? "Close Converter" : "Convert Days/Months"}
            </button>
          )}
        </div>

        <select
          disabled={!canEditFrequency}
          className={`${fieldClass} ${!canEditFrequency ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
          value={`${value.intervalUnit}:${value.intervalCount}`}
          onChange={(e) => {
            const [intervalUnit, count] = e.target.value.split(":")
            onChange({ ...value, intervalUnit, intervalCount: Number(count) })
          }}
        >
          <option value="MON_SAT:1">Daily (Monday - Saturday)</option>
          {STANDARD_WEEK_INTERVALS.map((item) => (
            <option key={item.days} value={`DAY:${item.days}`}>
              {item.label}
            </option>
          ))}
          <option value="MONTH:1">1 Month (Calendar Month)</option>
          <option value="MONTH:3">3 Months (Calendar Quarter)</option>
          <option value="MONTH:6">6 Months (Calendar Half-Year)</option>
          <option value="MONTH:12">12 Months (Calendar Year)</option>
        </select>

        {/* Quick Frequency Converter Popover */}
        {showConverter && canEditFrequency && (
          <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-900">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Automatic Frequency Week Converter
              </span>
              <button
                type="button"
                onClick={() => setShowConverter(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Bubbles O2 SOP normalizes all PM frequencies to standard week intervals. Enter days or months below to auto-align:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={converterAmount}
                onChange={(e) => setConverterAmount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
              />
              <select
                value={converterUnit}
                onChange={(e) => setConverterUnit(e.target.value as "DAY" | "MONTH")}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="DAY">Days</option>
                <option value="MONTH">Months</option>
              </select>
              <button
                type="button"
                onClick={handleApplyConverter}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 font-bold text-white hover:bg-indigo-700 transition"
              >
                <Check className="h-3 w-3" /> Apply {previewConverted.label}
              </button>
            </div>
            <div className="text-[11px] text-indigo-700 font-medium">
              Converts to: <strong>{previewConverted.label}</strong> ({previewConverted.days} days cycle)
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Checklist Section */}
      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
            SOP Checklist / Work Instructions
            {!canEditWork && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <Lock className="h-3 w-3" /> View Only (Requires Edit PMC Work Instructions)
              </span>
            )}
          </label>
          {canEditWork && (
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task Item
            </button>
          )}
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
                readOnly={!canEditWork}
                placeholder={`Task item ${index + 1} (e.g. Check Engine Oil & Filter)`}
                className={`${fieldClass} ${!canEditWork ? "bg-slate-50 text-slate-600" : ""}`}
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
              />
              {canEditWork && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  title="Delete this task item"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium">Assigned PIC (Notification Recipients) — Optional</p>
        <PICPicker ids={value.picIds} users={users} onChange={(picIds) => onChange({ ...value, picIds })} />
      </div>
    </div>
  )
}

