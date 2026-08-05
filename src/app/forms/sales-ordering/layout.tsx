import { redirect } from "next/navigation"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { SalesOrderingTabs } from "@/components/sales-ordering/SalesOrderingTabs"

export default async function SalesOrderingLayout({ children }: { children: React.ReactNode }) {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-3">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Sales Ordering Department</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Order Intake & Fulfilment</h1>
      </header>
      <SalesOrderingTabs permissions={{
        dashboard: canAccessSalesOrderingTab(access, "dashboard"),
        intake: canAccessSalesOrderingTab(access, "intake"),
        orders: canAccessSalesOrderingTab(access, "orders"),
        customers: canAccessSalesOrderingTab(access, "customers"),
      }} />
      {children}
    </main>
  )
}
