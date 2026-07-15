"use client"

import { addDays, format, isToday, isTomorrow, startOfDay } from "date-fns"
import { BellOff, CalendarClock, Repeat } from "lucide-react"
import {
  occurrencesOnDay,
  getReminderTheme,
  targetSummary,
  WEEKDAY_LONG_BM,
  MONTH_BM,
  type ReminderDTO,
} from "./reminder-utils"

const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")
const DAYS_AHEAD = 14

function dayHeading(day: Date): string {
  if (isToday(day)) return "Hari Ini"
  if (isTomorrow(day)) return "Esok"
  return `${WEEKDAY_LONG_BM[day.getDay()]}, ${day.getDate()} ${MONTH_BM[day.getMonth()]}`
}

/** "Akan Datang": the next 14 days of computed occurrences, grouped by day. */
export function ReminderList({
  reminders,
  onSelectReminder,
}: {
  reminders: ReminderDTO[]
  onSelectReminder: (r: ReminderDTO) => void
}) {
  const active = reminders.filter((r) => r.enabled)
  const today = startOfDay(new Date())

  const groups: { day: Date; occ: ReturnType<typeof occurrencesOnDay> }[] = []
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i)
    const occ = occurrencesOnDay(active, day)
    if (occ.length) groups.push({ day, occ })
  }

  if (!groups.length) {
    return (
      <div className="reminder-in-fade flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <BellOff className="h-7 w-7 text-indigo-400" />
        </div>
        <p className="mt-4 text-sm font-bold text-gray-700">Tiada peringatan akan datang</p>
        <p className="mt-1 max-w-xs text-xs text-gray-500">
          Tiada peringatan aktif dalam {DAYS_AHEAD} hari seterusnya. Klik &quot;Peringatan Baru&quot; untuk mula.
        </p>
      </div>
    )
  }

  let globalIndex = 0

  return (
    <div className="reminder-in-fade space-y-5">
      {groups.map(({ day, occ }) => (
        <div key={day.toISOString()}>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-black uppercase tracking-wider",
                isToday(day) ? "text-indigo-600" : "text-gray-500"
              )}
            >
              {dayHeading(day)}
            </span>
            <span className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="space-y-2">
            {occ.map(({ reminder, timeLabel }) => {
              const theme = getReminderTheme(reminder.category)
              const isNext = globalIndex++ === 0
              return (
                <button
                  key={`${reminder.id}-${day.toISOString()}`}
                  type="button"
                  onClick={() => onSelectReminder(reminder)}
                  className={cn(
                    "reminder-list-in group flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-3.5",
                    isNext && "reminder-next-glow border-violet-200"
                  )}
                >
                  <span className={cn("h-10 w-1.5 shrink-0 rounded-full", theme.bar)} />
                  <div className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100">
                    <span className="text-[11px] font-black tabular-nums text-gray-700">{timeLabel}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-gray-800">{reminder.title}</span>
                      {reminder.frequency !== "ONCE" && (
                        <Repeat className={cn("h-3 w-3 shrink-0", theme.text)} />
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {targetSummary(reminder).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold sm:flex",
                      theme.soft,
                      theme.softText
                    )}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {theme.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
