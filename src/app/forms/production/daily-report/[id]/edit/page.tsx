import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DailyReportForm } from "@/components/forms/DailyReportForm"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

async function AsyncEditForm({ id, userName }: { id: string; userName: string }) {
  const report = await prisma.dailyReport.findUnique({
    where: { id },
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
    const access = await getAccessInfo()
    const canEditApproved = report.status === "APPROVED" && !!access && hasAnyModule(access, ["DAILY_REPORT_EDIT_APPROVED"])
    if (!canEditApproved) {
      redirect(`/forms/production/daily-report/${id}`)
    }
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
        category = `BOX_${size}_${pack}`;
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

    if (!initialData.inventory[i.sectionKey]) return;

    const hasBatch = !!(i.batchNo && i.batchNo.trim() !== "");
    if (!hasBatch && !((i.type === "Usage" || i.type === "Storeroom") && i.bags > 0)) return;

    const entry: any = {
      batchNo: hasBatch ? (i.batchNo.includes('|') ? i.batchNo : `${i.batchNo}|${i.mult}`) : "",
      bags: i.bags,
      mult: i.mult,
      period: i.period || undefined,
      // Non-LABEL sections never have a meaningful label type — dropping it here stops a
      // legacy row from carrying its stale value back into the form and being re-saved.
      labelType: i.sectionKey === "LABEL"
        ? (i.labelType === "Standard" ? "Standard Front" : (i.labelType || undefined))
        : undefined
    }

    if (i.sectionKey === "CAP" && i.type === "Usage") {
      let weight: any = "";
      let boxes: any = "";
      if (i.labelType) {
        try {
          const parsed = JSON.parse(i.labelType);
          if (parsed.weight !== undefined) weight = parsed.weight;
          const pb = parsed.boxes ?? parsed.originalBags;
          if (pb !== undefined && pb !== "" && Number(pb) > 0) boxes = pb;
        } catch(e) {
          // fallback
        }
      }
      if ((boxes === "" || Number(boxes) === 0) && (Number(weight) || 0) === 0 && Number(i.bags) > 0) {
        boxes = i.bags;
      }
      entry.weight = weight;
      entry.boxes = boxes;
      entry.labelType = undefined;
    }

    if (i.type === "Storeroom" || i.type === "CarryForward") {
      initialData.inventory[i.sectionKey].sources.push(entry)
    } else if (i.type === "Usage") {
      initialData.inventory[i.sectionKey].usages.push(entry)
    }
  })

  // Populate Holds
  report.holds.forEach(h => {
    if (initialData.inventory[h.sectionKey] && h.batchNo && h.batchNo.trim() !== "") {
      initialData.inventory[h.sectionKey].holds.push({
        batchNo: h.batchNo.includes('|') ? h.batchNo : `${h.batchNo}|${h.mult}`,
        qty: h.qty,
        mult: h.mult,
        reason: h.reason || ""
      })
    }
  })

  // Ensure default structure
  Object.keys(initialData.inventory).forEach(key => {
    if (initialData.inventory[key].sources.length === 0) {
      initialData.inventory[key].sources.push({ batchNo: "", bags: 0, mult: 1 })
    }
    if (initialData.inventory[key].usages.length === 0) {
      initialData.inventory[key].usages.push({ period: "Before", batchNo: "", bags: 0 })
    }
  })

  return <DailyReportForm userName={userName} initialData={initialData} reportId={report.id} />
}

function FormSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="h-12 bg-gray-100 rounded-xl"></div>
      </div>
      <div className="h-64 bg-gray-100 rounded-xl"></div>
    </div>
  )
}

export default async function EditDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const resolvedParams = await params

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Edit Daily Report</h1>
        <p className="text-gray-500 font-medium mt-1">Make corrections to the submitted report.</p>
      </div>

      <Suspense fallback={<FormSkeleton />}>
        <AsyncEditForm id={resolvedParams.id} userName={session.user?.name || ""} />
      </Suspense>
    </div>
  )
}
