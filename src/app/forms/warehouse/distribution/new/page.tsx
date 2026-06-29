import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAvailableInventory } from "@/app/actions/warehouse"
import { CreateDOForm } from "./CreateDOForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewDistributionOrderPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const availableInventory = await getAvailableInventory()

  return (
    <div className="max-w-4xl">
      <Link href="/warehouse/distribution" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 mb-6 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to DO List
      </Link>
      
      <div className="bg-white border-4 border-black p-6 sm:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
        <div className="absolute -top-4 -right-4 bg-yellow-400 border-4 border-black px-4 py-2 rotate-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="font-black uppercase tracking-widest text-sm">Transfer Out</span>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-8">Create Distribution Order</h2>
        
        <CreateDOForm availableInventory={availableInventory} userId={user.id} />
      </div>
    </div>
  )
}
