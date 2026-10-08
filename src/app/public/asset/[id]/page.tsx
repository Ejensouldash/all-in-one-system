import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Package, MapPin, Building2, Tag, ShieldCheck, CheckCircle2, Wrench, Sparkles, QrCode, ArrowRight, Camera } from "lucide-react"
import Link from "next/link"

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

  const isBlankQR = asset.name === "[Blank QR - Ready to Register]"

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10">
            {isBlankQR ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mb-4 border border-amber-500/30 shadow-lg animate-pulse">
                <QrCode className="w-8 h-8" />
              </div>
            ) : asset.imageUrl ? (
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

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {isBlankQR ? "Blank QR Sticker" : asset.name}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 border border-teal-500/30 text-teal-300 font-mono font-bold text-xs">
                {asset.department?.code || "DEPT"}
              </span>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">
                {asset.department?.name || "Bubbles O2 Asset"}
              </p>
            </div>
          </div>
        </div>

        {/* Condition / Status Badge */}
        {isBlankQR ? (
          <div className="bg-amber-50 border-b border-amber-100 p-4 text-center">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-600" /> Ready for Asset Registration
            </span>
          </div>
        ) : (
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
        )}

        {/* Content Section */}
        <div className="p-6 sm:p-8 space-y-6">
          {isBlankQR ? (
            <div className="bg-gradient-to-br from-amber-50 to-teal-50 border-2 border-dashed border-teal-400/50 rounded-2xl p-6 text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">Stiker QR Belum Didaftarkan</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                  Stiker ini telah dicop untuk department <span className="font-bold text-teal-700">{asset.department?.code} ({asset.department?.name})</span>. 
                  Sila klik butang di bawah untuk memasukkan nama aset, jenama, no. siri, serta mengambil gambar aset fizikal ini.
                </p>
              </div>

              <Link
                href={`/dashboard/assets/${asset.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm shadow-md transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" /> Daftarkan Aset Ini Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center text-slate-500 mb-1">
                    <Building2 className="w-4 h-4 mr-2 text-teal-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Department</span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    {asset.department?.code ? `${asset.department.code} - ${asset.department.name}` : (asset.department?.name || 'Unassigned')}
                  </p>
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

              <div className="pt-2 text-center">
                <Link
                  href={`/dashboard/assets/${asset.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-bold transition-colors"
                >
                  Kemas kini maklumat / Ambil gambar aset <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
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

