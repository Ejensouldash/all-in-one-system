import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getHandover } from "@/app/actions/handover"
import { WarehouseHandoverReceive } from "@/components/forms/WarehouseHandoverReceive"

export default async function HandoverReceivePage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const response = await getHandover(params.id)
  if (!response.success || !response.data) {
    return <div>Handover not found or error occurred.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <WarehouseHandoverReceive 
          handover={response.data} 
          userId={user.id} 
          userName={user.name} 
        />
      </div>
    </div>
  )
}
