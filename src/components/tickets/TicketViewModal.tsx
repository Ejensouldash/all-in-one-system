"use client"

import { Clock, CheckCircle2, AlertCircle, X, Phone, Tag, Box, Laptop, Cpu, Hash } from "lucide-react"

export function TicketViewModal({ ticket, onClose, isSuperAdmin = false }: { ticket: any, onClose: () => void, isSuperAdmin?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-3xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Dynamic Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 p-6 md:p-8 text-white flex-shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/30 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all shadow-inner"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex items-center gap-3 mb-3">
            <span className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-black tracking-widest shadow-inner backdrop-blur-md flex items-center">
              <Hash className="h-3 w-3 mr-1 text-blue-300" />
              BO2-IT-{ticket.ticketNumber.toString().padStart(4, '0')}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-md backdrop-blur-md ${
              ticket.status === 'RESOLVED' ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/50' :
              ticket.status === 'IN_PROGRESS' ? 'bg-blue-500/30 text-blue-100 border border-blue-400/50' : 'bg-amber-500/30 text-amber-100 border border-amber-400/50'
            }`}>
              {ticket.status === 'RESOLVED' && <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              {ticket.status === 'IN_PROGRESS' && <Clock className="mr-1.5 h-3.5 w-3.5 animate-pulse" />}
              {ticket.status === 'OPEN' && <AlertCircle className="mr-1.5 h-3.5 w-3.5" />}
              {ticket.status.replace("_", " ")}
            </span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100 leading-tight mb-4 pr-10 relative z-10">
            {ticket.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-sm font-medium relative z-10">
            <span className="flex items-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
              <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 flex items-center justify-center text-white text-[10px] font-bold mr-2 border border-white/20">
                {(ticket.requesterName || ticket.createdBy?.name || "U").charAt(0)}
              </div>
              {ticket.requesterName || ticket.createdBy?.name || "Unknown"}
            </span>
            {ticket.phone && (
              <span className="flex items-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
                <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-300" /> {ticket.phone}
              </span>
            )}
            <span className="flex items-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner ml-auto text-blue-100">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-300" /> 
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Content Body (Scrollable if absolutely necessary, but designed to be compact) */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-gradient-to-b from-gray-50/50 to-white">
          
          {/* Main Description */}
          <div className="mb-6">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1.5" /> Description
            </h3>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {isSuperAdmin && (
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Priority</h3>
                <p className={`font-bold text-sm ${
                  ticket.priority === 'Urgent' ? 'text-red-600' : ticket.priority === 'High' ? 'text-orange-600' : 'text-slate-700'
                }`}>{ticket.priority}</p>
              </div>
            )}
            
            {(ticket.assetType || ticket.assetNumber || ticket.linkedAsset) && (
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 flex items-center">
                  <Laptop className="h-3 w-3 mr-1" /> Asset Info
                </h3>
                {ticket.linkedAsset ? (
                  <div>
                    <p className="font-bold text-indigo-900 text-sm">{ticket.linkedAsset.brand} {ticket.linkedAsset.model}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">SN: {ticket.linkedAsset.serialNumber}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-indigo-900 text-sm">{ticket.assetType || "Unknown"}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">Asset No: {ticket.assetNumber || "N/A"}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resolution Block if Resolved */}
          {ticket.status === 'RESOLVED' && (
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 mb-2">
              <h3 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Resolution Details
              </h3>
              <p className="text-emerald-800 text-sm font-medium leading-relaxed bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                {ticket.resolution || "Issue resolved by IT Team."}
              </p>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
