import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { LayoutDashboard } from "lucide-react"
import { FormsAnalyticsClient } from "@/components/forms/FormsAnalyticsClient"

export default async function FormsDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 1. Fetch Production Outputs
  const reports = await prisma.dailyReport.findMany({
    where: { 
      status: "APPROVED",
      date: { gte: thirtyDaysAgo }
    }, // Only count approved data for analytics
    include: {
      productions: { include: { batches: true } },
      rejects: true,
      inventory: true
    },
    orderBy: { date: 'asc' }
  })

  // 2. Fetch Transfer Ins
  const transferIns = await prisma.transferIn.findMany({
    where: {
      receiveDate: { gte: thirtyDaysAgo }
    },
    include: { items: true },
    orderBy: { receiveDate: 'asc' }
  })

  // 3. Aggregate Data for Charts
  let totalBoxesProduced = 0
  let totalRejects = 0
  let totalTransferBags = 0

  // Chart 1: Production Trend (Group by Date)
  const productionTrendMap: Record<string, number> = {}
  
  // Chart 2: Top Rejects (Group by Item)
  const rejectMap: Record<string, number> = {}

  reports.forEach(report => {
    const dateStr = new Date(report.date).toLocaleDateString('en-GB')
    if (!productionTrendMap[dateStr]) productionTrendMap[dateStr] = 0

    // Sum productions
    report.productions.forEach(prod => {
      totalBoxesProduced += prod.totalBox
      productionTrendMap[dateStr] += prod.totalBox
    })

    // Sum rejects
    report.rejects.forEach(rej => {
      const rejectSum = rej.before + rej.after
      totalRejects += rejectSum
      if (!rejectMap[rej.item]) rejectMap[rej.item] = 0
      rejectMap[rej.item] += rejectSum
    })
  })

  const productionTrendData = Object.keys(productionTrendMap).map(date => ({
    date,
    boxes: productionTrendMap[date]
  }))

  const rejectData = Object.keys(rejectMap).map(item => ({
    name: item,
    value: rejectMap[item]
  })).sort((a, b) => b.value - a.value).slice(0, 5) // Top 5

  // Chart 3: Incoming Stock Trend
  const incomingTrendMap: Record<string, number> = {}
  transferIns.forEach(ti => {
    const dateStr = new Date(ti.receiveDate).toLocaleDateString('en-GB')
    if (!incomingTrendMap[dateStr]) incomingTrendMap[dateStr] = 0
    ti.items.forEach(item => {
      totalTransferBags += item.bags
      incomingTrendMap[dateStr] += item.bags
    })
  })

  const incomingTrendData = Object.keys(incomingTrendMap).map(date => ({
    date,
    bags: incomingTrendMap[date]
  }))

  // 4. Calculate detailed rejects and reject rates per category (BOTTLE, CAP, LABEL, BOX)
  const categoryStats: Record<string, { usage: number, rejects: number, rate: number }> = {
    BOTTLE: { usage: 0, rejects: 0, rate: 0 },
    CAP: { usage: 0, rejects: 0, rate: 0 },
    LABEL: { usage: 0, rejects: 0, rate: 0 },
    BOX: { usage: 0, rejects: 0, rate: 0 }
  }

  reports.forEach(report => {
    // Accumulate usages
    report.inventory.forEach(inv => {
      if (inv.type === "Usage") {
        let cat = "";
        if (inv.sectionKey === "BOTTLE") cat = "BOTTLE";
        else if (inv.sectionKey === "CAP") cat = "CAP";
        else if (inv.sectionKey === "LABEL") cat = "LABEL";
        else if (inv.sectionKey.startsWith("BOX_")) cat = "BOX";
        
        if (cat) {
          categoryStats[cat].usage += (inv.bags * inv.mult);
        }
      }
    });

    // Accumulate rejects
    report.rejects.forEach(rej => {
      const rejectSum = rej.before + rej.after;
      let cat = "";
      if (rej.item === "BOTTLE") cat = "BOTTLE";
      else if (rej.item === "CAP") cat = "CAP";
      else if (rej.item === "LABEL") cat = "LABEL";
      else if (rej.item.startsWith("BOX")) cat = "BOX";
      
      if (cat) {
        categoryStats[cat].rejects += rejectSum;
      }
    });
  });

  // Calculate rate for each category
  Object.keys(categoryStats).forEach(cat => {
    const usage = categoryStats[cat].usage;
    const rejects = categoryStats[cat].rejects;
    categoryStats[cat].rate = (usage + rejects) > 0 ? (rejects / (usage + rejects)) * 100 : 0;
  });

  // Overall reject rate based on total rejects / total inputs (usages + rejects)
  const totalUsages = Object.values(categoryStats).reduce((sum, item) => sum + item.usage, 0);
  const overallRejectRate = (totalUsages + totalRejects) > 0 
    ? ((totalRejects / (totalUsages + totalRejects)) * 100).toFixed(2)
    : "0.00";

  // Fetch Latest Inventory Balances (From the most recently created report)
  let latestInventory: any[] = []
  const latestReport = await prisma.dailyReport.findFirst({
    where: { status: "APPROVED" },
    orderBy: { createdAt: 'desc' },
    include: { inventory: true }
  })
  
  if (latestReport) {
    // Only get "Storeroom" balances from the most recent report
    latestInventory = latestReport.inventory.filter(inv => inv.type === "Storeroom")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-in fade-in duration-500 pb-12">
      <FormsTabs role={user.trueRole || user.role} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <LayoutDashboard className="w-6 h-6 mr-3 text-indigo-600" />
            Forms Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Real-time visualization of production outputs, quality control, and inventory.</p>
        </div>
      </div>

      <FormsAnalyticsClient 
        productionTrendData={productionTrendData}
        rejectData={rejectData}
        incomingTrendData={incomingTrendData}
        totalBoxesProduced={totalBoxesProduced}
        totalRejects={totalRejects}
        totalTransferBags={totalTransferBags}
        latestInventory={latestInventory}
        categoryStats={categoryStats}
        overallRejectRate={overallRejectRate}
      />
    </div>
  )
}
