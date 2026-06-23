import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Cpu, Settings, Tag, User, MapPin, Map, Server, Calendar, Hash, PenTool, CheckCircle2 } from "lucide-react"
import { MaintenanceLogForm } from "@/components/assets/MaintenanceLogForm"

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") redirect("/dashboard")

  const { id } = await params

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { 
      unit: { include: { branch: true } },
      logs: { orderBy: { date: 'desc' } }
    }
  })

  if (!asset) notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
              asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
              asset.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {asset.status}
            </span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              {asset.category}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mt-3">{asset.brand} {asset.model}</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <Hash className="w-4 h-4 mr-1.5" /> Serial: {asset.serialNumber || 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Maintenance History & Audit Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center">
              <PenTool className="w-5 h-5 mr-2 text-blue-600" /> Maintenance & Audit Log
            </h2>

            {/* Timeline */}
            <div className="space-y-6 border-l-2 border-gray-100 ml-3 pl-6 relative">
              {asset.logs.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4">No maintenance history recorded for this asset yet.</p>
              ) : asset.logs.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[35px] top-1 h-4 w-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 tracking-wider uppercase">
                        {log.action}
                      </span>
                      <span className="text-xs font-bold text-gray-400">{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium my-2">{log.description}</p>
                    <div className="text-xs text-gray-500 flex items-center">
                      <User className="w-3 h-3 mr-1" /> Logged by {log.performedBy || "System"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Form to add log */}
          <MaintenanceLogForm assetId={asset.id} currentStatus={asset.status} />
        </div>

        {/* Right Col: Metadata */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 pb-4 border-b border-gray-100">
              Hardware Details
            </h3>
            
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="text-gray-400 mb-1 flex items-center text-xs font-bold uppercase"><Tag className="h-4 w-4 mr-2" /> Asset Tag / Barcode</dt>
                <dd className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{asset.barcode || "N/A"}</dd>
              </div>

              <div>
                <dt className="text-gray-400 mb-1 flex items-center text-xs font-bold uppercase"><User className="h-4 w-4 mr-2" /> Assigned To</dt>
                <dd className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {asset.assigneeName ? (
                    <span className="flex items-center"><div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mr-2">{asset.assigneeName.charAt(0)}</div> {asset.assigneeName}</span>
                  ) : "Unassigned"}
                </dd>
              </div>

              <div>
                <dt className="text-gray-400 mb-1 flex items-center text-xs font-bold uppercase"><MapPin className="h-4 w-4 mr-2" /> Department</dt>
                <dd className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {asset.unit?.name || "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-gray-400 mb-1 flex items-center text-xs font-bold uppercase"><Map className="h-4 w-4 mr-2" /> Location (Physical)</dt>
                <dd className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{asset.location || "N/A"}</dd>
              </div>
            </dl>
          </div>
        </div>

      </div>
    </div>
  )
}
