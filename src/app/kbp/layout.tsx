import { redirect } from "next/navigation"
import { QrCode } from "lucide-react"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { KbpTabs } from "@/components/kbp/KbpTabs"

export const metadata = {
  title: "KBP — Batch QR",
}

export default async function KbpLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["KBP"])) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 print:hidden">
          <div className="flex items-center space-x-4">
            <QrCode className="h-10 w-10 text-yellow-600" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                KBP
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Batch Traceability &amp; QR Sticker
              </p>
            </div>
          </div>
        </div>

        <KbpTabs />

        {children}
      </div>
    </div>
  )
}
