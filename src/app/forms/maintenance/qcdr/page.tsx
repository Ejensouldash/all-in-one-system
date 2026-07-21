import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { QCDRForm } from "./QCDRForm"

export const metadata = {
  title: "QC Daily Report - SGMP/18/QCDR",
}

export default async function QCDRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/qcdr")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <QCDRForm userName={userName} />
      </div>
    </div>
  )
}
