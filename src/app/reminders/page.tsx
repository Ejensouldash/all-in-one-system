import { redirect } from "next/navigation"
import { BellRing, Sparkles, Zap } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { RemindersClient } from "@/components/reminders/RemindersClient"
import { RemindersTabs } from "@/components/reminders/RemindersTabs"

export const dynamic = "force-dynamic"

export default async function RemindersPage() {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["REMINDERS"])) redirect("/dashboard")

  const me = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { unitId: true },
  })

  // Visibility: superadmin sees all; others see reminders they created,
  // are explicitly invited to, or that target their unit / their modules.
  const where = access.isSuperAdmin
    ? {}
    : {
        OR: [
          { createdById: access.userId },
          { recipients: { some: { userId: access.userId } } },
          { targetUnitId: me?.unitId || "__none__" },
          ...(access.modules.length ? [{ targetModules: { hasSome: access.modules } }] : []),
        ],
      }

  const reminders = await prisma.reminder.findMany({
    where,
    include: {
      targetUnit: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      recipients: { include: { user: { select: { id: true, name: true, email: true } } } },
      deliveries: { orderBy: { sentAt: "desc" }, take: 10 },
    },
    orderBy: { createdAt: "desc" },
  })

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })

  const units = await prisma.unit.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const seededCount = await prisma.reminder.count({ where: { seedKey: { not: null } } })

  // Render "Today" in Malaysia time (server runs in UTC on Vercel)
  const todayLabel = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="animate-in fade-in space-y-5 pb-20 duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-indigo-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="reminder-bell flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <BellRing className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Reminder Calendar</h1>
              <p className="mt-1 max-w-xl text-sm text-indigo-100">
                Jadualkan peringatan e-mel automatik — sekali, harian, mingguan atau bulanan — untuk diri
                sendiri, pengguna lain, atau seluruh unit. Klik mana-mana hari untuk mula.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 self-start sm:items-end">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-4 w-4 text-indigo-100" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-100">Hari Ini</div>
                <div className="text-sm font-bold text-white">{todayLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20 backdrop-blur">
              <Zap className="h-3 w-3 text-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                Enjin: setiap jam (MYT)
              </span>
            </div>
          </div>
        </div>
      </div>

      <RemindersTabs><RemindersClient
        reminders={reminders as any}
        allUsers={allUsers}
        units={units}
        currentUserId={access.userId}
        isSuperAdmin={access.isSuperAdmin}
        showSeedButton={access.isSuperAdmin && seededCount < 3}
      /></RemindersTabs>
    </div>
  )
}
