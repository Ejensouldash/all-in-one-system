import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Package, MonitorSmartphone, MapPin, Activity, CalendarDays, Fingerprint, Tags, FileText, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

export default async function AssetQRReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { unit: true }
  })

  if (!asset) notFound()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 print:p-0 print:bg-white sm:py-10">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] overflow-hidden print:shadow-none print:border-none border border-gray-100">
        
        {/* Header Block */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white text-center relative">
          <div className="absolute top-4 right-4 print:hidden">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
              asset.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              asset.status === 'MAINTENANCE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              <Activity className="h-3 w-3 mr-1.5" /> {asset.status}
            </span>
          </div>
          
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 mb-4 shadow-inner ring-1 ring-white/20">
            <MonitorSmartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">{asset.brand}</h1>
          <p className="text-xl font-medium text-gray-300 mt-1">{asset.model}</p>
          
          <div className="mt-6 inline-flex items-center bg-white/5 rounded-lg px-4 py-2 border border-white/10">
            <Fingerprint className="h-4 w-4 text-gray-400 mr-2" />
            <span className="font-mono text-sm font-medium tracking-widest">{asset.barcode || asset.serialNumber || "NO-ID"}</span>
          </div>
        </div>

        {/* Details Block */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                <Tags className="h-3.5 w-3.5 mr-1.5" /> Category
              </div>
              <p className="font-semibold text-gray-900">{asset.category}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                <MapPin className="h-3.5 w-3.5 mr-1.5" /> Location
              </div>
              <p className="font-semibold text-gray-900">{asset.unit?.name || "Unassigned HQ"}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center">
            <div className="bg-blue-100 p-3 rounded-xl mr-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">Assigned To</p>
              <p className="font-bold text-blue-900 text-lg">{asset.assigneeName || "Ready for Deployment"}</p>
            </div>
          </div>
        </div>

        {/* Footer Data */}
        <div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-between items-center text-xs font-medium text-gray-500">
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-1.5 text-gray-400" />
            Added {format(asset.createdAt, "MMM yyyy")}
          </div>
          <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified
          </div>
        </div>

      </div>
    </div>
  )
}
