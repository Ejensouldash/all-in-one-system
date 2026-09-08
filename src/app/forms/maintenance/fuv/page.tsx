import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FUVForm } from "./FUVForm"
import { getHazardProcessRecordByDateAndShift } from "./actions"

export const metadata = {
  title: "Hazard and Process Control Records - SGMP/19/FUV",
}

export default async function FUVPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/fuv")

  const userName = session.user.name || "Unknown User"

  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const currentHour = now.getHours()
  const defaultShift: "DAY" | "NIGHT" = currentHour >= 7 && currentHour < 19 ? "DAY" : "NIGHT"

  let initialRecord = null
  try {
    const res = await getHazardProcessRecordByDateAndShift(todayStr, defaultShift)
    if (res && res.success && res.data) {
      initialRecord = res.data
    }
  } catch (e) {
    console.error("Failed to preload FUV record on server:", e)
  }

  return (
    <div className="bg-slate-50 min-h-screen pt-6 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FUVForm
          userName={userName}
          initialRecord={initialRecord}
          initialDate={todayStr}
          initialShift={defaultShift}
        />
      </div>
    </div>
  )
}
