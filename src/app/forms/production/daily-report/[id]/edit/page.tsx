import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DailyReportForm } from "@/components/forms/DailyReportForm"

export default async function EditDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const resolvedParams = await params
  const report = await prisma.dailyReport.findUnique({
    where: { id: resolvedParams.id },
    include: {
      productions: { include: { batches: true } },
      rejects: true,
      breakdowns: true,
      inventory: true
    }
  })

  if (!report) redirect("/forms")
  if (report.status !== "PENDING") {
    // Only pending reports can be edited
    redirect(`/forms/production/daily-report/${resolvedParams.id}`)
  }

  // Transform Prisma data back to React Hook Form structure
  const initialData: any = {
    date: report.date.toISOString().split('T')[0],
    shift: report.shift,
    line: report.line,
    preparedBy: report.preparedBy,
    verifiedBy: report.verifiedBy || "",
    remarks: report.remarks || "",
    totalManpower: report.totalManpower ? report.totalManpower.toString() : "",
    
    production: {
      p800_12: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
      p800_20: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
      p425_24: { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
      p425_6:  { checked: false, qty: 0, batches: [{ batchNo: "", qty: 0, type: "Standard", otherType: "" }] },
    },

    rejectsScrap: {
      cap: { before: 0, after: 0 },
      bottle: { before: 0, after: 0 },
      label: { before: 0, after: 0 },
      box: { before: 0, after: 0 },
    },
    rejectsReturn: {
      cap: { before: 0, after: 0 },
      bottle: { before: 0, after: 0 },
      label: { before: 0, after: 0 },
      box: { before: 0, after: 0 },
    },
    breakdowns: report.breakdowns || [],

    inventory: {
      BOTTLE: { sources: [], usages: [] },
      LABEL: { sources: [], usages: [] },
      CAP: { sources: [], usages: [] },
      BOX_p800_12: { sources: [], usages: [] },
      BOX_p800_20: { sources: [], usages: [] },
      BOX_p425_24: { sources: [], usages: [] },
      BOX_p425_6: { sources: [], usages: [] },
    }
  }

  // Populate Productions
  report.productions.forEach(p => {
    if (initialData.production[p.productType]) {
      initialData.production[p.productType].checked = true
      initialData.production[p.productType].qty = p.totalBox
      if (p.batches.length > 0) {
        initialData.production[p.productType].batches = p.batches.map(b => ({
          batchNo: b.batchNo,
          qty: b.qty,
          type: b.type,
          otherType: b.otherType || ""
        }))
      }
    }
  })

  // Populate Rejects
  report.rejects.forEach(r => {
    if (r.type === "RETURN" && initialData.rejectsReturn[r.item]) {
      initialData.rejectsReturn[r.item] = { before: r.before, after: r.after }
    } else if (initialData.rejectsScrap[r.item]) {
      initialData.rejectsScrap[r.item] = { before: r.before, after: r.after }
    }
  })

  // Populate Inventory
  report.inventory.forEach(i => {
    if (initialData.inventory[i.sectionKey]) {
      const entry = {
        batchNo: i.batchNo,
        bags: i.bags,
        mult: i.mult,
        period: i.period || undefined,
        labelType: i.labelType || undefined
      }
      if (i.type === "Storeroom") {
        initialData.inventory[i.sectionKey].sources.push(entry)
      } else {
        initialData.inventory[i.sectionKey].usages.push(entry)
      }
    }
  })

  // Ensure default structure if array is empty (to avoid hook form errors)
  Object.keys(initialData.inventory).forEach(key => {
    if (initialData.inventory[key].sources.length === 0) {
      initialData.inventory[key].sources.push({ batchNo: "", bags: 0, mult: 1 })
    }
    if (initialData.inventory[key].usages.length === 0) {
      initialData.inventory[key].usages.push({ period: "Before", batchNo: "", bags: 0 })
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Edit Daily Report</h1>
        <p className="text-gray-500 font-medium mt-1">Make corrections to the submitted report.</p>
      </div>

      <DailyReportForm userName={session.user.name || ""} initialData={initialData} reportId={report.id} />
    </div>
  )
}
