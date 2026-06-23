"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, CheckCircle2, AlertCircle, Eye, Edit3, Timer } from "lucide-react"
import { TicketViewModal } from "./TicketViewModal"

function getSLAStatus(ticket: any) {
  if (ticket.status === 'RESOLVED') return { text: "Met", color: "text-emerald-600 bg-emerald-50", breached: false }
  if (!ticket.slaDeadline) return { text: "No SLA", color: "text-gray-500 bg-gray-50", breached: false }

  const now = new Date()
  const deadline = new Date(ticket.slaDeadline)
  const isBreached = now > deadline

  if (isBreached) {
    return { text: "BREACHED", color: "text-red-700 bg-red-100 border border-red-300 font-bold animate-pulse", breached: true }
  } else {
    const diff = deadline.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return { text: "< 1h left", color: "text-orange-700 bg-orange-100 font-bold", breached: false }
    return { text: `${hours}h left`, color: "text-blue-600 bg-blue-50", breached: false }
  }
}

export function TicketTable({ tickets, isSuperAdmin }: { tickets: any[], isSuperAdmin: boolean }) {
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {isSuperAdmin && (
                  <>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Status</th>
                  </>
                )}
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">No tickets found.</td>
                </tr>
              ) : tickets.map((ticket) => {
                const sla = getSLAStatus(ticket)
                return (
                <tr key={ticket.id} className={`transition-colors ${sla.breached ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 font-bold tracking-wide text-sm bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                      BO2-IT-{ticket.ticketNumber.toString().padStart(4, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">
                      {ticket.title}
                    </div>
                    {ticket.linkedAsset && (
                      <div className="text-xs text-gray-500 mt-1 font-medium">Asset: {ticket.linkedAsset.brand} {ticket.linkedAsset.model}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                      ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {ticket.status === 'RESOLVED' && <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                      {ticket.status === 'IN_PROGRESS' && <Clock className="mr-1.5 h-3.5 w-3.5" />}
                      {ticket.status === 'OPEN' && <AlertCircle className="mr-1.5 h-3.5 w-3.5" />}
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{ticket.priority}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs tracking-wide ${sla.color}`}>
                          {sla.breached && <Timer className="mr-1 h-3 w-3" />}
                          {sla.text}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ticket.requesterName || ticket.createdBy?.name || "Unknown"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" suppressHydrationWarning>
                    {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors group relative" 
                        title="View Ticket"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {isSuperAdmin && (
                        <Link href={`/tickets/${ticket.id}`} className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-colors group relative" title="Update Ticket (Admin)">
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <TicketViewModal 
          ticket={selectedTicket} 
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </>
  )
}
