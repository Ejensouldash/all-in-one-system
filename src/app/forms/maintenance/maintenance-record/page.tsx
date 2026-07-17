import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceRecordForm } from "./MaintenanceRecordForm"

export const metadata = {
  title: "Maintenance Record - SGMP/04/MR",
}

export default async function MaintenanceRecordPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/maintenance-record")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MaintenanceRecordForm userName={userName} />
      </div>
    </div>
  )
}
