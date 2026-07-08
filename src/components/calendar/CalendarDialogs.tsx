// @ts-nocheck
"use client"

import { useEffect, useRef, useState } from "react"
import {
  X,
  User,
  Users,
  UserPlus,
  CalendarClock,
  Trash2,
  Pencil,
  CircleAlert,
  FileText,
  CalendarPlus,
  CalendarRange,
  Search,
  Send,
  BellRing,
  Sparkles,
} from "lucide-react"
import {
  detectCategory,
  getTheme,
  toLocalInput,
  fmtDateLong,
  fmtTimeRange,
  fmtDuration,
  isMultiDay,
  RSVP_STATUS,
  guestSummary,
  findUserStatus,
  initials,
  avatarGradient,
} from "./calendar-utils"

const cn = (...a) => a.filter(Boolean).join(" ")

function Spinner({ className = "" }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  )
}

function Avatar({ name, className = "h-8 w-8 text-[11px]" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white",
        avatarGradient(name || "?"),
        className
      )}
    >
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Modal shell                                                        */
/* ------------------------------------------------------------------ */

function ModalShell({ open, onClose, children, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="calendar-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "calendar-pop max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl calendar-scroll",
          maxWidth
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Guest inviter (used inside the form)                               */
/* ------------------------------------------------------------------ */

function GuestInviter({ allUsers, guests, setGuests, excludeId }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  const selectedIds = new Set(guests.map((g) => g.id))
  const q = query.trim().toLowerCase()
  const results = (allUsers || [])
    .filter(
      (u) =>
        u.id !== excludeId &&
        !selectedIds.has(u.id) &&
        (!q ||
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.googleEmail || "").toLowerCase().includes(q))
    )
    .slice(0, 6)

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const add = (u) => {
    setGuests((prev) => [...prev, { id: u.id, name: u.name, email: u.email }])
    setQuery("")
    setOpen(true)
  }
  const remove = (id) => setGuests((prev) => prev.filter((g) => g.id !== id))

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
        <UserPlus className="h-3.5 w-3.5" /> Invite Guests
        {guests.length > 0 && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
            {guests.length}
          </span>
        )}
      </label>

      {/* Selected guest chips */}
      {guests.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {guests.map((g) => (
            <span
              key={g.id}
              className="calendar-chip-in flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-0.5 pl-0.5 pr-2 text-xs font-semibold text-gray-700 shadow-sm"
            >
              <Avatar name={g.name} className="h-5 w-5 text-[9px] ring-0" />
              <span className="max-w-[120px] truncate">{g.name}</span>
              <button
                type="button"
                onClick={() => remove(g.id)}
                className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Hidden inputs consumed by the server action */}
      {guests.map((g) => (
        <input key={g.id} type="hidden" name="attendeeIds" value={g.id} />
      ))}

      {/* Search */}
      <div className="relative" ref={boxRef}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search people to invite..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-3 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
        />
        {open && results.length > 0 && (
          <div className="calendar-pop absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl calendar-scroll">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => add(u)}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-blue-50"
              >
                <Avatar name={u.name} className="h-8 w-8 text-[11px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-800">{u.name}</span>
                  {u.email && <span className="block truncate text-[11px] text-gray-400">{u.email}</span>}
                </span>
                <UserPlus className="h-4 w-4 text-blue-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add / Edit form                                                    */
/* ------------------------------------------------------------------ */

export function EventFormModal({ open, mode, event, slot, itStaff, allUsers, currentUserId, onClose, onSubmit }) {
  const isEdit = mode === "edit"
  const [title, setTitle] = useState("")
  const [guests, setGuests] = useState([])
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(isEdit ? event?.title ?? "" : "")
      setGuests(
        isEdit && event?.attendees
          ? event.attendees.map((a) => ({ id: a.userId, name: a.name, email: a.email }))
          : []
      )
      setError("")
      setPending(false)
    }
  }, [open, isEdit, event])

  if (!open) return null

  const start = isEdit ? event?.start : slot?.start
  const end = isEdit ? event?.end : slot?.end
  const theme = getTheme(detectCategory(title))
  const PreviewIcon = theme.icon

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const s = new Date(formData.get("startDateTime"))
    const en = new Date(formData.get("endDateTime"))
    if (en < s) {
      setError("End time cannot be before the start time.")
      return
    }
    setPending(true)
    const res = await onSubmit(formData)
    if (res && !res.success) {
      setError(res.error || "Something went wrong. Please try again.")
      setPending(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm", theme.solid)}>
            {isEdit ? <Pencil className="h-5 w-5" /> : <CalendarPlus className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Event" : "New Event"}</h3>
            <p className="text-xs text-gray-500">
              {isEdit ? "Update the schedule details" : "Add a new item to the schedule"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:rotate-90 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Event Title</label>
          <input
            name="title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Server Maintenance, Meeting Sage X3"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
          {title.trim() && (
            <div className="calendar-fade-in mt-2 flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">Auto-tagged as</span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", theme.soft, theme.softText)}>
                <PreviewIcon className="h-3 w-3" />
                {theme.label}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Starts</label>
            <input
              name="startDateTime"
              required
              type="datetime-local"
              defaultValue={start ? toLocalInput(start) : ""}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Ends</label>
            <input
              name="endDateTime"
              required
              type="datetime-local"
              defaultValue={end ? toLocalInput(end) : ""}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Owner / Assignee</label>
          <select
            name="assigneeId"
            defaultValue={event?.raw?.assignee?.id ?? ""}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Unassigned</option>
            {itStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        <GuestInviter allUsers={allUsers} guests={guests} setGuests={setGuests} excludeId={currentUserId} />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={event?.description ?? ""}
            placeholder="Add notes, agenda or details..."
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {guests.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-[11px] font-medium text-blue-700">
            <BellRing className="h-4 w-4 shrink-0" />
            {guests.length} {guests.length === 1 ? "guest" : "guests"} will be added to this event and can track their RSVP.
          </div>
        )}

        {error && (
          <div className="calendar-shake flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-medium text-rose-600">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="calendar-btn-glow flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-70"
          >
            {pending ? <Spinner /> : isEdit ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Create & Invite"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  View details                                                       */
/* ------------------------------------------------------------------ */

export function EventViewModal({ open, event, currentUserId, onClose, onEdit, onDelete, onRespond }) {
  const [respondingTo, setRespondingTo] = useState(null)
  const [rsvpError, setRsvpError] = useState("")

  useEffect(() => {
    if (open) {
      setRespondingTo(null)
      setRsvpError("")
    }
  }, [open, event?.id])

  if (!open || !event) return null

  const theme = getTheme(event.category)
  const Icon = theme.icon
  const multiDay = isMultiDay(event)
  const summary = guestSummary(event.attendees)
  const myStatus = findUserStatus(event, currentUserId)

  const handleRespond = async (status) => {
    setRespondingTo(status)
    setRsvpError("")
    const res = await onRespond(status)
    if (res && !res.success) setRsvpError(res.error || "Failed to update your response.")
    setRespondingTo(null)
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      {/* Colored header band */}
      <div className={cn("relative overflow-hidden p-5 text-white", theme.solid)}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-xl" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition-all hover:rotate-90 hover:bg-white/30"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
          <Icon className="h-3.5 w-3.5" />
          {theme.label}
        </span>
        <h3 className="mt-3 pr-10 text-xl font-bold leading-snug">{event.title}</h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">{fmtDateLong(event.start)}</div>
            <div className="text-xs text-gray-500">
              {fmtTimeRange(event.start, event.end)}
              <span className="mx-1.5 text-gray-300">|</span>
              {fmtDuration(event.start, event.end)}
            </div>
            {multiDay && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600">
                <CalendarRange className="h-3 w-3" />
                Ends {fmtDateLong(event.end)}
              </div>
            )}
          </div>
        </div>

        {/* Organizer + assignee */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {event.createdByName && (
            <div className="flex items-center gap-2">
              <Avatar name={event.createdByName} className="h-7 w-7 text-[10px]" />
              <div className="leading-tight">
                <div className="text-sm font-medium text-gray-800">{event.createdByName}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Organizer</div>
              </div>
            </div>
          )}
          {event.assigneeName && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-gray-800">{event.assigneeName}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Owner</div>
              </div>
            </div>
          )}
        </div>

        {/* Guests */}
        {event.attendees.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Users className="h-4 w-4 text-gray-400" />
                {summary.total} {summary.total === 1 ? "Guest" : "Guests"}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                {summary.GOING > 0 && <span className="text-emerald-600">{summary.GOING} going</span>}
                {summary.MAYBE > 0 && <span className="text-amber-600">{summary.MAYBE} maybe</span>}
                {summary.DECLINED > 0 && <span className="text-rose-500">{summary.DECLINED} no</span>}
                {summary.PENDING > 0 && <span className="text-slate-400">{summary.PENDING} awaiting</span>}
              </div>
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto calendar-scroll">
              {event.attendees.map((a, i) => {
                const st = RSVP_STATUS[a.status]
                const StIcon = st.icon
                return (
                  <div
                    key={a.id}
                    className="calendar-list-in flex items-center gap-2.5 rounded-lg bg-white px-2 py-1.5 ring-1 ring-gray-100"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Avatar name={a.name} className="h-7 w-7 text-[10px]" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                      {a.name}
                      {a.userId === currentUserId && <span className="ml-1 text-[10px] text-gray-400">(you)</span>}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", st.soft, st.softText)}>
                      <StIcon className="h-3 w-3" />
                      {st.short}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Your RSVP */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Your Response
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["GOING", "MAYBE", "DECLINED"].map((k) => {
              const st = RSVP_STATUS[k]
              const StIcon = st.icon
              const active = myStatus === k
              const loading = respondingTo === k
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!!respondingTo}
                  onClick={() => handleRespond(k)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-95",
                    active
                      ? cn(st.solid, "border-transparent text-white shadow-md")
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {loading ? <Spinner className="h-3.5 w-3.5" /> : <StIcon className="h-3.5 w-3.5" />}
                  {st.label}
                </button>
              )
            })}
          </div>
          {rsvpError && <div className="mt-2 text-[11px] font-medium text-rose-600">{rsvpError}</div>}
        </div>

        {event.description && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Description</div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{event.description}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => onDelete(event)}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            onClick={() => onEdit(event)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4" />
            Edit Event
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation                                                */
/* ------------------------------------------------------------------ */

export function DeleteConfirmModal({ open, event, onClose, onConfirm }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setPending(false)
      setError("")
    }
  }, [open])

  if (!open || !event) return null

  const handleConfirm = async () => {
    setPending(true)
    setError("")
    const res = await onConfirm(event)
    if (res && !res.success) {
      setError(res.error || "Failed to delete event.")
      setPending(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">Delete this event?</h3>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-semibold text-gray-700">&ldquo;{event.title}&rdquo;</span> will be permanently
          removed for everyone. This action cannot be undone.
        </p>

        {error && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-xs font-medium text-rose-600">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-70"
          >
            {pending ? <Spinner /> : null}
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
