import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Package, MapPin, Building2, Calendar, Tag, ShieldCheck, DollarSign } from "lucide-react"

export default async function PublicAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const asset = await prisma.asset.findUnique({
    where: { id: resolvedParams.id },
    include: {
      department: true,
      location: true,
    }
  })

  if (!asset) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 mb-4 border border-teal-500/30">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{asset.name}</h1>
            <p className="text-slate-400 font-medium tracking-widest uppercase text-sm">
              {asset.assetTag}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-center">
          {asset.status === 'AVAILABLE' && <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm"><ShieldCheck className="w-4 h-4 mr-2"/> Available</span>}
          {asset.status === 'ASSIGNED' && <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">Assigned</span>}
          {asset.status === 'MAINTENANCE' && <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-orange-100 text-orange-800 border border-orange-200 shadow-sm">In Maintenance</span>}
          {asset.status === 'RETIRED' && <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-sm">Retired</span>}
        </div>

        {/* Content Section */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center text-slate-500 mb-1">
                <Tag className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Type</span>
              </div>
              <p className="font-semibold text-slate-800">{asset.type}</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center text-slate-500 mb-1">
                <Building2 className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Department</span>
              </div>
              <p className="font-semibold text-slate-800">{asset.department?.name || 'Unassigned'}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">Asset Specifications</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-0.5">Brand</p>
                <p className="font-semibold text-slate-800">{asset.brand || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Model</p>
                <p className="font-semibold text-slate-800">{asset.model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Serial Number</p>
                <p className="font-semibold text-slate-800">{asset.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Device ID / MAC</p>
                <p className="font-semibold text-slate-800">{asset.deviceId || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-slate-100">
             <h3 className="font-bold text-slate-800 text-lg">Location & Details</h3>
             <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start">
                <MapPin className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-indigo-900">{asset.location?.name || 'No Location Set'}</p>
                  <p className="text-sm text-indigo-700/80 mt-1">This asset is currently tracked at this physical location.</p>
                </div>
             </div>

             {asset.description && (
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                 <p className="text-sm text-slate-700">{asset.description}</p>
               </div>
             )}
          </div>
          
        </div>
        
        {/* Footer */}
        <div className="bg-slate-100 p-4 text-center text-xs text-slate-500 font-medium">
          Property of Bubbles O2 • Scanned via Asset Management System
        </div>
      </div>
    </div>
  )
}
