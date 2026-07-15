"use client"

import { isSameMonth, isToday, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { Repeat } from "lucide-react"
import {
  occurrencesOnDay,
  getReminderTheme,
  WEEKDAY_SHORT_BM,
  type ReminderDTO,
} from "./reminder-utils"

const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")
const MAX_PILLS = 3

function getMonthMatrix(date: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

export function ReminderCalendarGrid({
  reminders,
  date,
  onSelectReminder,
  onSelectDay,
}: {
  reminders: ReminderDTO[]
  date: Date
  onSelectReminder: (r: ReminderDTO) => void
  onSelectDay: (day: Date) => void
}) {
  const weeks = getMonthMatrix(date)

  return (
    <div className="reminder-in-fade overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">
        {WEEKDAY_SHORT_BM.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-2.5 text-center text-[11px] font-bold uppercase tracking-wider",
              i === 0 || i === 6 ? "text-gray-400" : "text-gray-500"
            )}
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const occ = occurrencesOnDay(reminders, day)
              const inMonth = isSameMonth(day, date)
              const today = isToday(day)
              const weekend = day.getDay() === 0 || day.getDay() === 6
              const visible = occ.slice(0, MAX_PILLS)
              const extra = occ.length - visible.length

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "reminder-daycell group relative min-h-[104px] cursor-pointer border-b border-r border-gray-100 p-1.5 transition-colors last:border-r-0",
                    !inMonth && "bg-gray-50/60",
                    inMonth && weekend && "bg-slate-50/40",
                    "hover:bg-indigo-50/40"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        today
                          ? "reminder-today-badge bg-indigo-600 text-white shadow-sm"
                          : inMonth
                          ? "text-gray-700"
                          : "text-gray-400"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="reminder-add-hint pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[13px] leading-none text-indigo-600">
                      +
                    </span>
                  </div>

                  <div className="space-y-1">
                    {visible.map(({ reminder, timeLabel }) => {
                      const theme = getReminderTheme(reminder.category)
                      const recurring = reminder.frequency !== "ONCE"
                      return (
                        <button
                          key={reminder.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectReminder(reminder)
                          }}
                          title={reminder.title}
                          className={cn(
                            "reminder-pill flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-medium",
                            theme.soft,
                            theme.softText,
                            !reminder.enabled && "opacity-45 saturate-50"
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", theme.dot)} />
                          <span className="hidden shrink-0 tabular-nums opacity-70 sm:inline">{timeLabel}</span>
                          <span className="min-w-0 flex-1 truncate">{reminder.title}</span>
                          {recurring && <Repeat className="h-2.5 w-2.5 shrink-0 opacity-70" />}
                        </button>
                      )
                    })}
                    {extra > 0 && (
                      <div className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-gray-500">
                        +{extra} lagi
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
