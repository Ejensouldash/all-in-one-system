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
      inventory: true,
      holds: true
    }
  })

  if (!report) redirect("/forms")
  if (report.status !== "PENDING" && report.status !== "REJECTED" && report.status !== "DRAFT") {
    // Only pending, rejected, or draft reports can be edited
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
    maxTotalManpower: report.maxTotalManpower ? report.maxTotalManpower.toString() : "",
    timeFrom: report.time ? report.time.split(" - ")[0] : "",
    timeTo: report.time ? report.time.split(" - ")[1] : "",
    reportTime: report.reportTime || "",
    preparedSignature: report.preparedSignature || "",
    verifiedSignature: report.verifiedSignature || "",
    noProduction: report.noProduction || false,
    
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
    breakdowns: (report.breakdowns || []).map(b => {
      const predefined = ["autoscrambler", "3 in 1", "rinsing 3 in 1", "filling 3 in 1", "capping 3 in 1", "blower", "buffer area", "conveyor", "label machine", "laser printer", "sealer machine", "robotic arm", "others"];
      if (predefined.includes(b.section)) {
        return b;
      }
      return { ...b, section: "others", customSection: b.section };
    }),

    inventory: {
      BOTTLE: { sources: [], usages: [], holds: [] },
      LABEL: { sources: [], usages: [], holds: [] },
      CAP: { sources: [], usages: [], holds: [] },
      BOX_p800_12: { sources: [], usages: [], holds: [] },
      BOX_p800_20: { sources: [], usages: [], holds: [] },
      BOX_p425_24: { sources: [], usages: [], holds: [] },
      BOX_p425_6: { sources: [], usages: [], holds: [] },
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
    const itemKey = r.item.toLowerCase()
    if (r.type === "RETURN") {
      initialData.rejectsReturn[itemKey] = { before: r.before, after: r.after }
    } else {
      initialData.rejectsScrap[itemKey] = { before: r.before, after: r.after }
    }
  })

  // Populate Inventory
  const hasExplicitTransferIns = report.inventory.some((i: any) => i.type === "TransferIn" || i.type === "TransferInFlag");
  if (hasExplicitTransferIns) {
    initialData.syncedDOs = [];
  }
  
  report.inventory.forEach(i => {
    if (i.type === "TransferInFlag") return;
    if (i.type === "TransferIn") {
      let category = "";
      if (i.sectionKey === "CAP") category = "CAP";
      else if (i.sectionKey === "BOTTLE") category = "BOTTLE " + (report.line.includes("800") ? "800ML" : "425ML");
      else if (i.sectionKey === "LABEL") category = "LABEL";
      else if (i.sectionKey.startsWith("BOX_")) {
        const size = i.sectionKey.replace("BOX_p", "").split("_")[0];
        const pack = i.sectionKey.split("_")[2];
        category = `BOX_${size}_${pack}`; // Enough for includes("BOX") and includes(size)
      }
      
      initialData.syncedDOs.push({
        id: `explicit-${i.id}`,
        doNumber: i.labelType || "",
        batchNo: i.batchNo,
        bags: i.bags,
        mult: i.mult,
        category: category
      });
      return;
    }

    // Skip empty rows (batchNo === "") that were saved by accident
    if (initialData.inventory[i.sectionKey] && i.batchNo && i.batchNo.trim() !== "") {
      const entry: any = {
        batchNo: `${i.batchNo}|${i.mult}`,
        bags: i.bags,
        mult: i.mult,
        period: i.period || undefined,
        labelType: i.labelType || undefined
      }

      if (i.sectionKey === "CAP" && i.type === "Usage") {
        // We only have bags in DB. Reconstruct pseudo boxes and weight so form doesn't calculate 0 pcs on save.
        const pcs = i.bags * 4000;
        entry.boxes = 0;
        entry.weight = Number((pcs * 0.002125).toFixed(2));
      }

      if (i.type === "Storeroom" || i.type === "CarryForward") {
        initialData.inventory[i.sectionKey].sources.push(entry)
      } else if (i.type === "Usage") {
        initialData.inventory[i.sectionKey].usages.push(entry)
      }
    }
  })

  // Populate Holds (Quarantine/On Hold) from the dedicated ProductionHoldItem relation
  report.holds.forEach(h => {
    if (initialData.inventory[h.sectionKey] && h.batchNo && h.batchNo.trim() !== "") {
      initialData.inventory[h.sectionKey].holds.push({
        batchNo: `${h.batchNo}|${h.mult}`,
        qty: h.qty,
        mult: h.mult,
        reason: h.reason || ""
      })
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
