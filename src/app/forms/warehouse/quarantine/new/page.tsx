import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ReturnForm } from "./ReturnForm"

export default async function NewReturnPage({
  searchParams
}: {
  searchParams: Promise<{ doId?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { doId } = await searchParams
  let doOrder = null
  if (doId) {
    doOrder = await prisma.distributionOrder.findUnique({
      where: { id: doId },
      include: { items: true }
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-tighter">Log Returned / Damaged Goods</h2>
      
      {!doOrder ? (
        <div className="bg-red-50 text-red-600 p-4 font-bold border-2 border-red-200">
          Valid DO ID is required. Please select a DO from the Distribution list.
        </div>
      ) : (
        <ReturnForm doOrder={doOrder} userId={session.user.id} />
      )}
    </div>
  )
}
