import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { BranchForm, UnitForm, DeleteButton, CostCatalogForm } from "./OrganizationForms"
import { Building2, Network, Receipt } from "lucide-react"

export default async function OrganizationPage() {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") redirect("/dashboard")

  const branches = await prisma.branch.findMany({
    include: { _count: { select: { units: true, users: true } } },
    orderBy: { createdAt: 'desc' }
  })

  const units = await prisma.unit.findMany({
    include: { 
      branch: true,
      _count: { select: { users: true, tickets: true, assets: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const costItems = await prisma.costCatalog.findMany({
    orderBy: { itemName: 'asc' }
  })


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Organization Structure</h1>
        <p className="text-gray-500 mt-1">Manage company branches, units, and physical facilities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Branches Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-800">Branches</h3>
            </div>
          </div>
          <div className="p-5 border-b border-gray-100 bg-white">
            <BranchForm />
          </div>
          <ul className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[400px]">
            {branches.length === 0 && <li className="p-5 text-center text-sm text-gray-500">No branches found.</li>}
            {branches.map(branch => (
              <li key={branch.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-medium text-gray-900">{branch.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{branch.location || 'No location set'} • {branch._count.units} Units • {branch._count.users} Users</div>
                </div>
                <DeleteButton id={branch.id} type="branch" />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-8">
          {/* Units Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">Departments / Units</h3>
              </div>
            </div>
            <div className="p-5 border-b border-gray-100 bg-white">
              <UnitForm branches={branches} />
            </div>
            <ul className="divide-y divide-gray-100 overflow-y-auto">
              {units.length === 0 && <li className="p-5 text-center text-sm text-gray-500">No units found.</li>}
              {units.map(unit => (
                <li key={unit.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">{unit.name}</div>
                    <div className="text-xs text-blue-600 mt-1 font-medium bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100">{unit.branch.name}</div>
                    <div className="text-xs text-gray-500 mt-1.5">{unit._count.users} Users • {unit._count.assets} Assets • {unit._count.tickets} Tickets</div>
                  </div>
                  <DeleteButton id={unit.id} type="unit" />
                </li>
              ))}
            </ul>
          </div>


        </div>

        {/* Cost Catalog Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[500px] lg:col-span-2">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-gray-800">IT Cost Catalog (Parts & Services)</h3>
            </div>
          </div>
          <div className="p-5 border-b border-gray-100 bg-white">
            <CostCatalogForm />
          </div>
          <ul className="divide-y divide-gray-100 overflow-y-auto grid grid-cols-1 sm:grid-cols-2">
            {costItems.length === 0 && <li className="p-5 text-center text-sm text-gray-500 col-span-2">No cost items defined yet.</li>}
            {costItems.map(item => (
              <li key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors border-r border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{item.itemName}</div>
                  <div className="text-sm text-green-600 font-bold mt-0.5">RM {item.defaultCost.toFixed(2)}</div>
                </div>
                <DeleteButton id={item.id} type="costItem" />
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
