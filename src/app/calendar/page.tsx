import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { InteractiveCalendar } from "@/components/calendar/InteractiveCalendar"

export default async function EventCalendarPage() {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/dashboard")

  const events = await prisma.event.findMany({
    include: { assignee: true, createdBy: true },
    orderBy: { startDateTime: 'asc' }
  })

  // We only fetch SUPERADMINs for the assignee dropdown
  const itStaff = await prisma.user.findMany({
    where: { role: "SUPERADMIN" },
    select: { id: true, name: true }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
            <CalendarDays className="h-6 w-6 mr-3 text-blue-600" />
            IT Schedule & Operations Calendar
          </h1>
          <p className="text-gray-500 mt-1">Full-screen interactive view. Click any day to add an event, or click an event to view details.</p>
        </div>
      </div>

      <InteractiveCalendar events={events} itStaff={itStaff} />
    </div>
  )
}
