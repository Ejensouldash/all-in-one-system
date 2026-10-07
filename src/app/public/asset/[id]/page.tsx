import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Package, MapPin, Building2, Tag, ShieldCheck, CheckCircle2, Wrench } from "lucide-react"

export default async function PublicAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
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
            {asset.imageUrl ? (
              <div className="mb-4 flex justify-center">
                <img 
                  src={asset.imageUrl} 
                  alt={asset.name} 
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-teal-400 shadow-md"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 mb-4 border border-teal-500/30">
                <Package className="w-8 h-8" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">{asset.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">
              {asset.department?.name || "Bubbles O2 Company Asset"}
            </p>
          </div>
        </div>

        {/* Condition / Status Badge */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-center gap-3">
          {asset.condition === 'Good' && (
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Condition: Good
            </span>
          )}
          {asset.condition === 'Usable' && (
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Condition: Usable
            </span>
          )}
          {asset.condition === 'Bad' && (
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
              <Wrench className="w-4 h-4 mr-1.5" /> Condition: Maintenance Required
            </span>
          )}
          {asset.condition === 'Unused' && (
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
              Condition: Unused
            </span>
          )}
          {!asset.condition && (
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Verified Asset
            </span>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center text-slate-500 mb-1">
                <Building2 className="w-4 h-4 mr-2 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Department</span>
              </div>
              <p className="font-bold text-slate-800 text-sm">{asset.department?.name || 'Unassigned'}</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center text-slate-500 mb-1">
                <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Location</span>
              </div>
              <p className="font-bold text-slate-800 text-sm">{asset.location?.name || 'Unassigned'}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Asset Specifications</h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-semibold mb-0.5">Brand</p>
                <p className="font-bold text-slate-800 text-sm">{asset.brand || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-semibold mb-0.5">Barcode / Serial Number</p>
                <p className="font-mono font-bold text-slate-800 text-sm">{asset.serialNumber || '—'}</p>
              </div>
            </div>
          </div>
          
          {asset.description && (
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Notes</h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-700 leading-relaxed">{asset.description}</p>
              </div>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <div className="bg-slate-100 p-4 text-center text-xs text-slate-500 font-medium">
          Property of Bubbles O2 • Official Asset Management Registry
        </div>
      </div>
    </div>
  )
}
