import { WarehouseDailyRawMaterialForm } from "@/components/forms/WarehouseDailyRawMaterialForm"
import { getLatestCarryForward } from "@/app/actions/warehouseDailyRawMaterial"
import { auth } from "@/auth"

export default async function NewDailyRawMaterialPage() {
  const session = await auth()
  
  // Load carry forward items from the most recent form
  const initialItems = await getLatestCarryForward()

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold uppercase">Daily Raw Material (Warehouse)</h1>
        <p className="text-gray-500">Create new daily raw material report</p>
      </div>
      
      <WarehouseDailyRawMaterialForm 
        userName={session?.user?.name || "Unknown"} 
        userId={session?.user?.id || ""}
        initialItems={initialItems} 
      />
    </div>
  )
}
