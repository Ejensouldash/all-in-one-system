// @ts-nocheck
"use client"

import { useEffect, useRef } from "react"
import { isSameDay, isSameMonth, isToday, format, setHours, addHours } from "date-fns"
import { Users } from "lucide-react"
import {
  getMonthMatrix,
  eventsOnDay,
  getTheme,
  fmtTimeShort,
  layoutDay,
  HOURS,
  hourLabel,
} from "./calendar-utils"

const cn = (...a) => a.filter(Boolean).join(" ")
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOUR_HEIGHT = 56

/* ================================================================== */
/*  Month View                                                         */
/* ================================================================== */

export function MonthView({ events, date, onSelectEvent, onSelectSlot, onNavigateDay }) {
  const weeks = getMonthMatrix(date)
  const MAX_CHIPS = 3

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">
        {WEEKDAYS.map((d, i) => (
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
              const dayEvents = eventsOnDay(events, day)
              const inMonth = isSameMonth(day, date)
              const today = isToday(day)
              const weekend = day.getDay() === 0 || day.getDay() === 6
              const visible = dayEvents.slice(0, MAX_CHIPS)
              const extra = dayEvents.length - visible.length

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onSelectSlot(setHours(day, 9), setHours(day, 10))}
                  className={cn(
                    "calendar-daycell group relative min-h-[104px] cursor-pointer border-b border-r border-gray-100 p-1.5 transition-colors last:border-r-0",
                    !inMonth && "bg-gray-50/60",
                    inMonth && weekend && "bg-slate-50/40",
                    "hover:bg-blue-50/40"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigateDay(day)
                      }}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        today
                          ? "calendar-today-badge bg-blue-600 text-white shadow-sm"
                          : inMonth
                          ? "text-gray-700 hover:bg-gray-200/70"
                          : "text-gray-400 hover:bg-gray-200/70"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                    <span className="calendar-add-hint pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[13px] leading-none text-blue-600">
                      +
                    </span>
                  </div>

                  <div className="space-y-1">
                    {visible.map((ev) => {
                      const theme = getTheme(ev.category)
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectEvent(ev)
                          }}
                          title={ev.title}
                          className={cn(
                            "calendar-event flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-medium",
                            theme.soft,
                            theme.softText
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", theme.dot)} />
                          <span className="hidden shrink-0 tabular-nums opacity-70 sm:inline">
                            {fmtTimeShort(ev.start)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                          {ev.attendees?.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5 opacity-70">
                              <Users className="h-2.5 w-2.5" />
                              {ev.attendees.length}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigateDay(day)
                        }}
                        className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-gray-500 hover:bg-gray-200/60 hover:text-gray-700"
                      >
                        +{extra} more
                      </button>
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

/* ================================================================== */
/*  Shared Time Grid (Week + Day)                                      */
/* ================================================================== */

function TimeGrid({ events, days, now, onSelectEvent, onSelectSlot, onNavigateDay }) {
  const scrollRef = useRef(null)

  // Scroll to a sensible default (7 AM) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT - 12
    }
  }, [])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Day headers */}
      <div className="flex border-b border-gray-200 bg-gray-50/70 pr-2">
        <div className="w-14 shrink-0 sm:w-16" />
        {days.map((day) => {
          const today = isToday(day)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onNavigateDay(day)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors hover:bg-white/70"
            >
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wider",
                  today ? "text-blue-600" : "text-gray-400"
                )}
              >
                {WEEKDAYS[day.getDay()]}
              </span>
              <span
                className={cn(
                  "flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-sm font-bold",
                  today ? "bg-blue-600 text-white shadow-sm" : "text-gray-700"
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          )
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="calendar-scroll relative max-h-[62vh] overflow-y-auto">
        <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour gutter */}
          <div className="w-14 shrink-0 sm:w-16">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2 right-2 text-[10px] font-semibold text-gray-400">
                  {h === 0 ? "" : hourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const positioned = layoutDay(eventsOnDay(events, day), day, HOUR_HEIGHT)
            const showNow = isSameDay(day, now)
            return (
              <div key={day.toISOString()} className="relative flex-1 border-l border-gray-100">
                {/* Hour cells (click to add) */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    onClick={() => onSelectSlot(setHours(day, h), addHours(setHours(day, h), 1))}
                    className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-blue-50/40"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Current-time indicator */}
                {showNow && (
                  <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: nowTop }}>
                    <div className="relative">
                      <div className="calendar-now-dot absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 shadow" />
                      <div className="h-px w-full bg-rose-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {positioned.map(({ event, top, height, leftPct, widthPct }) => {
                  const theme = getTheme(event.category)
                  const tiny = height < 40
                  const Icon = theme.icon
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(event)
                      }}
                      title={`${event.title} · ${fmtTimeShort(event.start)}`}
                      className={cn(
                        "calendar-event absolute z-10 overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm ring-1 ring-black/5",
                        theme.solid
                      )}
                      style={{
                        top: top + 1,
                        height: height - 2,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
                        {!tiny && <Icon className="h-3 w-3 shrink-0 opacity-90" />}
                        <span className="truncate">{event.title}</span>
                      </div>
                      {!tiny && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/85">
                          <span className="truncate">
                            {fmtTimeShort(event.start)} - {fmtTimeShort(event.end)}
                          </span>
                          {event.attendees?.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" />
                              {event.attendees.length}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function WeekView(props) {
  return <TimeGrid {...props} days={props.days} />
}

export function DayView(props) {
  return <TimeGrid {...props} days={[props.date]} />
}
