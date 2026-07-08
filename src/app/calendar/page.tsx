import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarDays, Sparkles } from "lucide-react"
import { InteractiveCalendar } from "@/components/calendar/InteractiveCalendar"

export default async function EventCalendarPage() {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/dashboard")

  const events = await prisma.event.findMany({
    include: {
      assignee: true,
      createdBy: true,
      attendees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { startDateTime: "asc" },
  })

  // We only fetch SUPERADMINs for the assignee dropdown
  const itStaff = await prisma.user.findMany({
    where: { role: "SUPERADMIN" },
    select: { id: true, name: true },
  })

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, googleEmail: true, role: true },
    orderBy: { name: "asc" },
  })

  // Render "Today" in Malaysia time (server runs in UTC on Vercel)
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="animate-in fade-in space-y-5 pb-20 duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <CalendarDays className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                IT Schedule &amp; Operations
              </h1>
              <p className="mt-1 max-w-xl text-sm text-blue-100">
                Plan, track and manage your team&apos;s events. Click any day or time slot to
                schedule, and select an event to view or edit its details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur sm:self-auto">
            <Sparkles className="h-4 w-4 text-blue-100" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">Today</div>
              <div className="text-sm font-bold text-white">{todayLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <InteractiveCalendar
        events={events}
        itStaff={itStaff}
        allUsers={allUsers}
        currentUserId={session.user.id}
      />
    </div>
  )
}
