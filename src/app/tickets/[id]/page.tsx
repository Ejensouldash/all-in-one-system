import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { AIAnalysisButton } from "./AIAnalysisButton"
import { ITWorkspace } from "./ITWorkspace"
import { Clock, CheckCircle2, AlertCircle, Phone, Laptop, MapPin, User, Tag, Calendar, ShieldAlert } from "lucide-react"

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return null

  const { id } = await params
  const isSuperAdmin = session.user.role === "SUPERADMIN"

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { createdBy: true, linkedAsset: true, unit: { include: { branch: true } }, assignee: true, costs: true }
  })

  if (!ticket) notFound()

  // Strict RBAC Logic
  if (!isSuperAdmin && ticket.createdById !== session.user.id && ticket.unitId !== session.user.unitId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-500/20">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Access Denied</h2>
        <p className="text-gray-500 mt-2 max-w-md">You do not have the required permissions to view this highly secure IT ticket. Please contact the administrator.</p>
      </div>
    )
  }

  const itStaffList = isSuperAdmin ? await prisma.user.findMany({ where: { role: "SUPERADMIN" } }) : []
  const costCatalog = isSuperAdmin ? await prisma.costCatalog.findMany({ orderBy: { itemName: 'asc' } }) : []

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      
      {/* 🌟 Premium Header Card with Glassmorphism & Gradients 🌟 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 border border-white/10 group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-white/10 text-white border border-white/20 px-4 py-1.5 rounded-full text-xs font-black tracking-[0.2em] shadow-inner backdrop-blur-md">
                BO2-IT-{ticket.ticketNumber.toString().padStart(4, '0')}
              </span>
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black tracking-wider shadow-[0_0_15px_rgba(0,0,0,0.2)] backdrop-blur-md ${
                ticket.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-emerald-500/20' :
                ticket.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-blue-500/20' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-amber-500/20'
              }`}>
                {ticket.status === 'RESOLVED' && <CheckCircle2 className="mr-2 h-4 w-4" />}
                {ticket.status === 'IN_PROGRESS' && <Clock className="mr-2 h-4 w-4 animate-pulse" />}
                {ticket.status === 'OPEN' && <AlertCircle className="mr-2 h-4 w-4" />}
                {ticket.status.replace("_", " ")}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-indigo-200 leading-tight">
              {ticket.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-blue-200/80 text-sm font-medium pt-2">
              <span className="flex items-center bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 shadow-inner">
                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold mr-3 border border-white/20 shadow-md">
                  {(ticket.requesterName || ticket.createdBy?.name || "U").charAt(0)}
                </div>
                {ticket.requesterName || ticket.createdBy?.name || "Unknown"}
              </span>
              {ticket.phone && (
                <span className="flex items-center bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 shadow-inner hover:bg-black/30 transition-colors">
                  <Phone className="h-4 w-4 mr-2 text-blue-400" /> {ticket.phone}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-center w-full md:w-auto">
            <div className="text-blue-200/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Date Logged</div>
            <div className="text-white text-xl md:text-2xl font-light tracking-widest">{new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div className="text-blue-300 text-sm font-medium mt-1">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Description & Resolution Workspace) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Issue Description Card */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 shadow-inner">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Detailed Description</h3>
            </div>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-[1.8] text-[15px] bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50">
              {ticket.description}
            </div>
          </div>
          
          {isSuperAdmin && (
            <div className="scroll-mt-32" id="workspace">
              <ITWorkspace ticket={ticket} itStaffList={itStaffList} costCatalog={costCatalog} />
              <div className="mt-6"><AIAnalysisButton description={ticket.description} /></div>
            </div>
          )}

          {!isSuperAdmin && ticket.status === "RESOLVED" && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100/50 p-8 rounded-[2.5rem] shadow-lg shadow-emerald-500/5">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner mr-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-emerald-900 font-black text-xl tracking-tight">Issue Resolved</h3>
              </div>
              <p className="text-emerald-800/80 leading-relaxed bg-white/50 p-5 rounded-2xl border border-emerald-100/30">
                {ticket.resolution || "The IT team has successfully resolved this issue. No further details were provided."}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar Metadata) */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-100 sticky top-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 pb-4 border-b border-gray-100 flex items-center">
              Metadata
            </h3>
            
            <dl className="space-y-8 text-sm">
              <div className="group">
                <dt className="text-gray-400 mb-2 flex items-center text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 mr-2 text-gray-300 group-hover:text-red-400 transition-colors" /> Priority Level
                </dt>
                <dd className="font-semibold text-gray-900">
                  <span className={`inline-flex px-4 py-1.5 rounded-xl border shadow-sm ${
                    ticket.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200' : 
                    ticket.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                    ticket.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {ticket.priority}
                  </span>
                </dd>
              </div>

              <div className="group">
                <dt className="text-gray-400 mb-2 flex items-center text-xs font-bold uppercase tracking-wider">
                  <MapPin className="h-4 w-4 mr-2 text-gray-300 group-hover:text-blue-400 transition-colors" /> Location / Unit
                </dt>
                <dd className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-blue-50/30 transition-colors">
                  <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                    {ticket.location ? `Loc: ${ticket.location}` : (ticket.unit?.branch?.name || "No Branch")}
                  </div>
                  <div className="font-black text-blue-950 text-base tracking-tight">{ticket.unit?.name || "Not Specified"}</div>
                </dd>
              </div>

              {(ticket.assetType || ticket.assetNumber || ticket.linkedAsset) && (
                <div className="group">
                  <dt className="text-gray-400 mb-2 flex items-center text-xs font-bold uppercase tracking-wider">
                    <Laptop className="h-4 w-4 mr-2 text-gray-300 group-hover:text-indigo-400 transition-colors" /> Hardware Asset
                  </dt>
                  <dd className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-[inset_0_2px_10px_rgba(255,255,255,1)]">
                    {ticket.linkedAsset ? (
                      <>
                        <div className="font-black text-indigo-950 text-lg tracking-tight mb-2">{ticket.linkedAsset.brand} {ticket.linkedAsset.model}</div>
                        <div className="text-xs text-indigo-700 font-bold bg-white inline-flex px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                          SN: {ticket.linkedAsset.serialNumber || "N/A"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-black text-indigo-950 text-lg tracking-tight mb-2">{ticket.assetType || "Unknown Asset"}</div>
                        <div className="text-xs text-indigo-700 font-bold bg-white inline-flex px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                          Asset No: {ticket.assetNumber || "N/A"}
                        </div>
                      </>
                    )}
                  </dd>
                </div>
              )}

              {ticket.assignee && (
                <div className="pt-6 border-t border-gray-100 group">
                  <dt className="text-gray-400 mb-3 text-xs uppercase font-bold tracking-wider flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-300 group-hover:text-emerald-400 transition-colors" /> Assigned IT Staff
                  </dt>
                  <dd className="font-bold text-gray-900 flex items-center bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-black mr-3 shadow-inner">
                      {ticket.assignee.name.charAt(0)}
                    </div>
                    {ticket.assignee.name}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

      </div>
    </div>
  )
}
