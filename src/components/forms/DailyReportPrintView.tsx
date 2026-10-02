import React from "react"

const CAP_PCS_PER_BOX = 4000
const CAP_BOX_WEIGHT_KG = 0.88
const CAP_KG_PER_PC = 0.002125

const capPcsFromInput = (weight: number, boxes: number) => {
  if (weight > 0 && boxes > 0) {
    const net = weight - boxes * CAP_BOX_WEIGHT_KG
    return net > 0 ? Math.round(net / CAP_KG_PER_PC) : 0
  }
  if (weight > 0) return Math.round(weight / CAP_KG_PER_PC)
  if (boxes > 0) return boxes * CAP_PCS_PER_BOX
  return 0
}

const isJsonLabelType = (labelType?: string | null) => !!labelType && labelType.trim().startsWith("{")

const parseCapMeta = (labelType?: string | null) => {
  if (!isJsonLabelType(labelType)) return null
  try {
    const p = JSON.parse(labelType!)
    return { weight: Number(p.weight) || 0, boxes: Number(p.boxes ?? p.originalBags) || 0 }
  } catch {
    return null
  }
}

const effectiveUsageBags = (u: any, sectionKey: string) => {
  const bags = Number(u.bags) || 0
  if (sectionKey !== "CAP" || bags > 0) return bags
  const meta = parseCapMeta(u.labelType)
  if (!meta) return bags
  const pcs = capPcsFromInput(meta.weight, meta.boxes)
  return pcs > 0 ? pcs / (Number(u.mult) || CAP_PCS_PER_BOX) : 0
}

const fmtBags = (n: number) => Math.round(n * 100) / 100

export interface DailyReportPrintViewProps {
  report: any
  transferIns?: any[]
  isBatchPrint?: boolean
}

export function DailyReportPrintView({ report, transferIns = [], isBatchPrint = false }: DailyReportPrintViewProps) {
  const getInventoryForSection = (key: string) => (report.inventory || []).filter((i: any) => i.sectionKey === key)

  return (
    <div
      className={`report-print-sheet print-container w-full max-w-[210mm] bg-white min-h-[297mm] print:min-h-0 print:box-border flex flex-col print:block shadow-md print:shadow-none border-2 print:border-2 border-black print:border-black mx-auto mb-10 print:mb-0 ${
        isBatchPrint ? "report-page-break" : ""
      }`}
    >
      {/* TOP CONTENT */}
      <div className="flex flex-col print:block">
        {/* Official GMP Header */}
        <div className="border-b-[4px] print:border-b-2 border-black bg-white print:bg-transparent">
          <div className="flex flex-col divide-y-[3px] print:divide-y-2 divide-black print:divide-black">
            {/* Row 1: Company Info & Logo */}
            <div className="p-4 sm:p-6 print:p-2 flex justify-between items-center">
              <div>
                <h2 className="font-black text-lg print:text-[12pt] tracking-tight uppercase text-black">
                  Bubbles O2 Sdn Bhd
                </h2>
                <p className="text-xs print:text-[10pt] font-bold text-gray-600 print:text-black leading-snug mt-1">
                  KOMPLEKS AL AMMAR,
                  <br />
                  KG KANCHONG,
                  <br />
                  71200, RANTAU,
                  <br />
                  NEGERI SEMBILAN
                </p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.ico"
                alt="Bubbles O2 Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 print:w-28 print:h-28 object-contain drop-shadow-sm print:shadow-none"
              />
            </div>

            {/* Row 2: Title */}
            <div className="p-3 sm:p-4 print:p-1 flex flex-col items-center justify-center text-center bg-blue-50/30 print:bg-transparent">
              <h1 className="text-xl sm:text-2xl print:text-[14pt] font-black uppercase tracking-tighter text-black leading-tight">
                Daily Production Report ({report.line})
              </h1>
            </div>

            {/* Row 3: GMP Control Info Table */}
            <div className="flex flex-col text-xs print:text-[10pt] font-bold bg-white print:bg-transparent">
              <div className="flex border-b-2 border-black print:border-black items-stretch">
                <div className="p-2 print:py-0.5 print:px-2 border-r-2 border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">
                  Rec. No
                </div>
                <div className="p-2 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">
                  SGMP/21/DPR1
                </div>
              </div>
              <div className="flex border-b-2 border-black print:border-black items-stretch">
                <div className="p-2 print:py-0.5 print:px-2 border-r-2 border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">
                  Issue No
                </div>
                <div className="p-2 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">
                  1/10/22
                </div>
              </div>
              <div className="flex border-b-2 border-black print:border-black items-stretch">
                <div className="p-2 print:py-0.5 print:px-2 border-r-2 border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">
                  Rev No
                </div>
                <div className="p-2 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">
                  4
                </div>
              </div>
              <div className="flex items-stretch">
                <div className="p-2 print:py-0.5 print:px-2 border-r-2 border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">
                  Effective Date
                </div>
                <div className="p-2 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">
                  01/07/2026
                </div>
              </div>
            </div>
          </div>

          {/* System Tag */}
          <div className="border-t-[3px] print:border-t-2 border-black bg-gray-100 print:bg-transparent p-2 print:py-0.5 print:px-2 flex justify-between items-center text-[10px] print:text-[8pt] sm:text-xs font-black uppercase px-4 sm:px-6">
            <span className="text-gray-500 print:text-black">Generated via Digital Operations</span>
            <span className="text-gray-700 print:text-black bg-white print:bg-transparent border border-gray-300 print:border-none px-2 py-0.5 print:p-0">
              System ID: {report.id?.split("-")[0]}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 print:p-2 space-y-6 print:space-y-2 flex flex-col flex-1">
          {/* Section 1: Shift Information */}
          <section className="print:break-inside-avoid mb-4 print:mb-2">
            <h2 className="text-base print:text-[11pt] font-black uppercase tracking-tight border-b-2 border-black pb-1 mb-2 print:mb-1 print:break-after-avoid">
              1. Shift Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 print:grid-cols-6 gap-2 print:gap-1.5">
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-2.5 print:py-1 print:px-2">
                <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5">
                  Date
                </p>
                <p className="font-bold text-sm print:text-[9.5pt]">
                  {new Date(report.date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-2.5 print:py-1 print:px-2">
                <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5">
                  Time
                </p>
                <p className="font-bold text-sm print:text-[9.5pt]">{report.time || "-"}</p>
              </div>
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-2.5 print:py-1 print:px-2">
                <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5">
                  Shift
                </p>
                <p className="font-black text-sm print:text-[9.5pt] text-blue-700 print:text-black">{report.shift}</p>
              </div>
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-2.5 print:py-1 print:px-2">
                <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5">
                  Line
                </p>
                <p className="font-bold text-sm print:text-[9.5pt]">{report.line}</p>
              </div>
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-2.5 print:py-1 print:px-2">
                <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5">
                  Total Manpower
                </p>
                <p className="font-bold text-sm print:text-[9.5pt]">
                  {report.totalManpower ? `${report.totalManpower} / ${report.maxTotalManpower || 10}` : "-"}
                </p>
              </div>
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-2.5 print:py-1 print:px-2">
                <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5">
                  Prepared By
                </p>
                <p className="font-bold text-sm print:text-[9.5pt] uppercase truncate" title={report.preparedBy}>
                  {report.preparedBy}
                </p>
              </div>
            </div>
          </section>

          {/* TWO COLUMN WRAPPER: PRODUCTION AND REJECTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-2 print:break-inside-avoid">
            {/* Section 2: Production */}
            <section className="print:break-inside-avoid">
              <h2 className="text-base print:text-[11pt] font-black uppercase tracking-tight border-b-2 border-black pb-1 mb-2 print:mb-1 print:break-after-avoid">
                2. Production Output
              </h2>
              <div className="space-y-2 print:space-y-1">
                {report.noProduction ? (
                  <div className="p-3 border-2 border-dashed border-gray-400 bg-gray-50 text-center font-bold uppercase text-gray-500 rounded print:border print:bg-transparent print:text-black text-xs">
                    No Production Run For This Shift
                  </div>
                ) : (
                  (report.productions || [])
                    .filter((prod: any) => prod.totalBox > 0)
                    .map((prod: any) => (
                      <div
                        key={prod.id}
                        className="border-2 print:border border-black bg-white print:bg-transparent print:break-inside-avoid"
                      >
                        <div className="bg-gray-100 print:bg-transparent border-b-2 print:border-b border-black p-2 print:py-0.5 print:px-2 font-black uppercase flex justify-between items-center text-xs print:text-[9pt]">
                          <span>{prod.productType.replace("p800_", "800ml x ").replace("p425_", "425ml x ")}</span>
                          <span className="bg-black text-white print:bg-transparent print:text-black print:border-l print:border-black px-2.5 print:px-1 py-0.5 text-xs print:text-[9pt]">
                            {prod.totalBox} Box
                          </span>
                        </div>
                        <table className="w-full text-xs print:text-[9pt]">
                          <thead className="bg-gray-50 print:bg-gray-100 border-b border-gray-200 print:border-black">
                            <tr>
                              <th className="p-1.5 print:py-0.5 print:px-2 text-left font-bold text-gray-500 print:text-black uppercase text-[10px] print:text-[8pt]">
                                Batch No
                              </th>
                              <th className="p-1.5 print:py-0.5 print:px-2 text-center font-bold text-gray-500 print:text-black uppercase text-[10px] print:text-[8pt]">
                                Type
                              </th>
                              <th className="p-1.5 print:py-0.5 print:px-2 text-right font-bold text-gray-500 print:text-black uppercase text-[10px] print:text-[8pt]">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(prod.batches || []).map((b: any) => (
                              <tr
                                key={b.id}
                                className="border-b border-gray-100 print:border-black last:border-0 font-bold"
                              >
                                <td className="p-1.5 print:py-0.5 print:px-2 uppercase">{b.batchNo}</td>
                                <td className="p-1.5 print:py-0.5 print:px-2 text-center text-blue-600 print:text-black">
                                  {b.type === "Others" ? b.otherType : b.type}
                                </td>
                                <td className="p-1.5 print:py-0.5 print:px-2 text-right">{b.qty} Box</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                )}
              </div>
            </section>

            {/* Section 3: Rejects */}
            <section className="print:break-inside-avoid">
              <h2 className="text-base print:text-[11pt] font-black uppercase tracking-tight border-b-2 border-black pb-1 mb-2 print:mb-1 print:break-after-avoid">
                3. Reject Logs
              </h2>
              <div>
                <table className="w-full border-2 print:border border-black text-xs print:text-[9pt]">
                  <thead className="bg-gray-100 print:bg-gray-100 border-b-2 print:border-b border-black">
                    <tr>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-left border-r-2 print:border-r border-black uppercase font-black">
                        Item
                      </th>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black uppercase font-black">
                        Before
                      </th>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black uppercase font-black">
                        After
                      </th>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-center bg-gray-200 print:bg-transparent uppercase font-black">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.rejects || [])
                      .filter((r: any) => {
                        if (r.type && r.type !== "SCRAP") return false
                        const is800 = (report.line || "").includes("800")
                        const is425 = (report.line || "").includes("425")
                        const item = (r.item || "").toUpperCase()
                        if (is800 && (item.includes("425") || item.includes("P425"))) return false
                        if (is425 && (item.includes("800") || item.includes("P800"))) return false
                        return true
                      })
                      .map((rej: any) => (
                        <tr
                          key={rej.id}
                          className="border-b-2 print:border-b border-black font-bold last:border-0"
                        >
                          <td className="p-1.5 print:py-0.5 print:px-2 border-r-2 print:border-r border-black uppercase">
                            {rej.item.startsWith("BOX_P")
                              ? `BOX (${rej.item.replace("BOX_P800_", "800 ML X ").replace("BOX_P425_", "425 ML X ")})`
                              : rej.item}
                          </td>
                          <td className="p-1.5 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black text-gray-600 print:text-black">
                            {rej.before}
                          </td>
                          <td className="p-1.5 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black text-gray-600 print:text-black">
                            {rej.after}
                          </td>
                          <td className="p-1.5 print:py-0.5 print:px-2 text-center bg-gray-100 print:bg-transparent text-red-600 print:text-black font-black">
                            {rej.before + rej.after}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Section 4: Inventory Summary */}
          <section>
            <h2 className="text-base print:text-[11pt] font-black uppercase tracking-tight border-b-2 border-black pb-1 mb-2 print:mb-1 print:break-after-avoid">
              4. Inventory Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-xs print:text-[8pt] border-collapse border-2 border-black bg-white">
                <thead className="bg-gray-100 font-black uppercase text-left border-b-2 border-black leading-tight text-[10px] print:text-[8pt]">
                  <tr>
                    <th className="w-[12%] p-1.5 print:p-1 border-r-2 border-black align-top" rowSpan={2}>
                      Material
                    </th>
                    <th className="w-[18%] p-1.5 print:p-1 border-r-2 border-black align-top" rowSpan={2}>
                      Storeroom Balance
                    </th>
                    <th className="w-[20%] p-1.5 print:p-1 border-r-2 border-black align-top" rowSpan={2}>
                      Transfer In (DO)
                    </th>
                    <th className="w-[30%] p-1.5 print:p-1 border-r-2 border-b-2 border-black align-top text-center" colSpan={2}>
                      Usage Log
                    </th>
                    <th className="w-[20%] p-1.5 print:p-1 align-top" rowSpan={2}>
                      Carry Forward
                    </th>
                  </tr>
                  <tr>
                    <th className="w-[15%] p-1 print:p-0.5 border-r border-black bg-blue-50/50 print:bg-transparent text-center">
                      Before
                    </th>
                    <th className="w-[15%] p-1 print:p-0.5 border-r-2 border-black bg-blue-50/50 print:bg-transparent text-center">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {["BOTTLE", "LABEL", "CAP", "BOX_p800_12", "BOX_p800_20", "BOX_p425_24", "BOX_p425_6"].map(key => {
                    const is800 = report.line?.includes("800")
                    const is425 = report.line?.includes("425")
                    const allowedBottleMults = is800 ? [225] : is425 ? [181, 162] : []
                    const showLabelType = key === "LABEL"

                    if (key.startsWith("BOX_")) {
                      if (is800 && !key.includes("800")) return null
                      if (is425 && !key.includes("425")) return null
                    }

                    const inv = getInventoryForSection(key)
                    if (inv.length === 0) return null

                    const sources = inv.filter((i: any) => i.type === "Storeroom" && i.batchNo?.trim())
                    const usages = inv.filter((i: any) => i.type === "Usage" && i.batchNo?.trim())

                    const titleName = key.startsWith("BOX_")
                      ? `BOX (${key.replace("BOX_p800_", "800 ML X ").replace("BOX_p425_", "425 ML X ")})`
                      : key

                    const hasExplicitTransferIns = (report.inventory || []).some(
                      (i: any) => i.type === "TransferIn" || i.type === "TransferInFlag"
                    )
                    const explicitTransferIns = (report.inventory || []).filter(
                      (i: any) => i.sectionKey === key && i.type === "TransferIn"
                    )

                    const sectionDOItems = hasExplicitTransferIns
                      ? explicitTransferIns.map((i: any) => ({
                          batchNo: i.batchNo,
                          mult: i.mult,
                          bags: i.bags,
                          doNumber: i.labelType,
                        }))
                      : transferIns
                          .flatMap(ti => (ti.items || []).map((item: any) => ({ ...item, doNumber: ti.doNumber })))
                          .filter((item: any) => {
                            if (key === "BOTTLE") {
                              if (item.category?.includes("BOTTLE")) {
                                return allowedBottleMults.length === 0 || allowedBottleMults.includes(item.mult)
                              }
                              return false
                            }
                            if (key === "LABEL") {
                              if (!item.category?.includes("LABEL")) return false
                              if (is800 && item.category?.includes("425")) return false
                              if (is425 && item.category?.includes("800")) return false
                              return true
                            }
                            if (key === "CAP") {
                              if (!item.category?.includes("CAP")) return false
                              if (is800 && item.category?.includes("425")) return false
                              if (is425 && item.category?.includes("800")) return false
                              return true
                            }
                            if (key.startsWith("BOX_")) {
                              const multStr = key.split("_").pop()
                              return item.category?.includes("BOX") && item.category?.includes(multStr!)
                            }
                            return false
                          })

                    const holdBatchSet = new Set([
                      ...(report.holds || []).map((h: any) => h.batchNo),
                      ...(report.inventory || []).filter((i: any) => i.type === "Hold").map((i: any) => i.batchNo),
                    ])

                    const sectionBatchNos = Array.from(
                      new Set([
                        ...sources.map((s: any) => `${s.batchNo}|${s.mult}`),
                        ...sectionDOItems.map((d: any) => `${d.batchNo}|${d.mult}`),
                        ...usages.map((u: any) => `${u.batchNo}|${u.mult}`),
                      ])
                    )

                    const multsByBatch: Record<string, Set<number>> = {}
                    sectionBatchNos.forEach((bk: any) => {
                      const [bn, m] = bk.split("|")
                      if (!multsByBatch[bn]) multsByBatch[bn] = new Set()
                      multsByBatch[bn].add(Number(m))
                    })

                    const carryForwardSummaries: any[] = []
                    sectionBatchNos.forEach((batchKey: any) => {
                      const [batchNo, multStr] = batchKey.split("|")
                      const multVal = Number(multStr)

                      const storeroomObj = sources.find((s: any) => s.batchNo === batchNo && s.mult === multVal)
                      const storeroomBags = sources
                        .filter((s: any) => s.batchNo === batchNo && s.mult === multVal)
                        .reduce((sum: number, s: any) => sum + s.bags, 0)

                      const todayDOBags = sectionDOItems
                        .filter((d: any) => d.batchNo === batchNo && d.mult === multVal)
                        .reduce((sum: number, d: any) => sum + d.bags, 0)

                      const startBags = storeroomBags + todayDOBags
                      const mult = multVal

                      const matchesThisBatch = (u: any) => {
                        const pureU = typeof u.batchNo === "string" ? u.batchNo.split("|")[0] : u.batchNo
                        if (pureU !== batchNo) return false
                        const uMult = Number(u.mult) || 1
                        const groupMults = multsByBatch[batchNo]
                        if (groupMults && groupMults.size > 1 && groupMults.has(uMult)) return uMult === multVal
                        return true
                      }

                      const beforeBags = usages
                        .filter((u: any) => matchesThisBatch(u) && u.period !== "After")
                        .reduce((sum: number, u: any) => sum + effectiveUsageBags(u, key), 0)

                      const afterBags = usages
                        .filter((u: any) => matchesThisBatch(u) && u.period === "After")
                        .reduce((sum: number, u: any) => sum + effectiveUsageBags(u, key), 0)

                      const usedBags = beforeBags + afterBags
                      const carryFwdBags = startBags - usedBags
                      carryForwardSummaries.push({
                        batchNo,
                        startBags,
                        usedBags,
                        carryFwdBags,
                        mult,
                        labelType: storeroomObj?.labelType,
                        isHold: holdBatchSet.has(batchNo),
                      })
                    })

                    const renderUsageEntry = (u: any) => {
                      const capMeta = key === "CAP" ? parseCapMeta(u.labelType) : null
                      const effBags = fmtBags(effectiveUsageBags(u, key))
                      return (
                        <div
                          key={u.id}
                          className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid"
                        >
                          <div>
                            {u.batchNo}{" "}
                            {showLabelType && u.labelType && !isJsonLabelType(u.labelType)
                              ? `(${u.labelType})`
                              : ""}
                          </div>
                          <div className="text-blue-700 print:text-black">
                            {effBags} <span className="text-[8px] print:text-[6pt] text-gray-500">(x{u.mult})</span>
                          </div>
                          {capMeta && (capMeta.boxes > 0 || capMeta.weight > 0) && (
                            <div className="text-[8px] print:text-[6pt] text-gray-500">
                              {capMeta.boxes > 0 ? `${capMeta.boxes} Box` : ""}
                              {capMeta.boxes > 0 && capMeta.weight > 0 ? " / " : ""}
                              {capMeta.weight > 0 ? `${capMeta.weight} kg` : ""} ={" "}
                              {capPcsFromInput(capMeta.weight, capMeta.boxes)} Pcs
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <tr key={key} className="border-b border-black print:border-black print:break-inside-avoid">
                        <td className="p-1.5 print:p-1 border-r-2 border-black bg-emerald-50 print:bg-transparent font-black uppercase text-emerald-900 print:text-black align-top break-words text-[10px] print:text-[8pt]">
                          {titleName}
                        </td>
                        <td className="p-1.5 print:p-1 border-r-2 border-black align-top break-words">
                          {sources.length === 0 ? (
                            <span className="text-gray-400 italic font-normal text-[10px] print:text-[8pt]">Nil</span>
                          ) : (
                            <div className="space-y-1">
                              {sources.map((s: any) => (
                                <div
                                  key={s.id}
                                  className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid"
                                >
                                  <div>
                                    {s.batchNo}{" "}
                                    {holdBatchSet.has(s.batchNo) ? (
                                      <span className="text-amber-600 print:text-black font-black">(HOLD)</span>
                                    ) : (
                                      ""
                                    )}{" "}
                                    {showLabelType && s.labelType ? `(${s.labelType})` : ""}
                                  </div>
                                  <div>
                                    {s.bags}{" "}
                                    <span className="text-[8px] print:text-[6pt] text-gray-500">(x{s.mult})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-1.5 print:p-1 border-r-2 border-black align-top break-words">
                          {sectionDOItems.length === 0 ? (
                            <span className="text-gray-400 italic font-normal text-[10px] print:text-[8pt]">Nil</span>
                          ) : (
                            <div className="space-y-1">
                              {sectionDOItems.map((s: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid"
                                >
                                  <div className="text-[8px] print:text-[6pt] text-gray-500 uppercase">{s.doNumber}</div>
                                  <div>
                                    {s.batchNo}{" "}
                                    {holdBatchSet.has(s.batchNo) ? (
                                      <span className="text-amber-600 print:text-black font-black">(HOLD)</span>
                                    ) : (
                                      ""
                                    )}
                                  </div>
                                  <div className="text-emerald-700 print:text-black">
                                    {s.bags}{" "}
                                    <span className="text-[8px] print:text-[6pt] text-gray-500">(x{s.mult})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-1.5 print:p-1 border-r border-black align-top break-words">
                          <div className="space-y-1">
                            {usages.filter((u: any) => u.period === "Before").map(renderUsageEntry)}
                          </div>
                        </td>
                        <td className="p-1.5 print:p-1 border-r-2 border-black align-top break-words">
                          <div className="space-y-1">
                            {usages.filter((u: any) => u.period === "After").map(renderUsageEntry)}
                          </div>
                        </td>
                        <td className="p-1.5 print:p-1 border-black align-top break-words bg-yellow-50/30 print:bg-transparent">
                          {carryForwardSummaries.length === 0 ? (
                            <span className="text-gray-400 italic font-normal text-[10px] print:text-[8pt]">Nil</span>
                          ) : (
                            <div className="space-y-1">
                              {carryForwardSummaries.map((summary: any) => (
                                <div
                                  key={`${summary.batchNo}|${summary.mult}`}
                                  className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-yellow-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid"
                                >
                                  <div className="uppercase mb-0.5">
                                    {summary.batchNo}{" "}
                                    {summary.isHold ? (
                                      <span className="text-amber-600 print:text-black font-black">(HOLD)</span>
                                    ) : (
                                      ""
                                    )}{" "}
                                    {showLabelType && summary.labelType ? `(${summary.labelType})` : ""}
                                  </div>
                                  <div className="whitespace-nowrap bg-yellow-100 print:bg-transparent px-1 print:px-0 py-0.5 rounded text-[9px] print:text-[7pt] text-gray-800">
                                    Av: {fmtBags(summary.startBags)} - {fmtBags(summary.usedBags)} ={" "}
                                    <span className="font-black text-[10px] print:text-[8pt] text-black">
                                      {fmtBags(summary.carryFwdBags)}
                                    </span>{" "}
                                    <span className="text-[8px] print:text-[6pt] text-gray-600">(x{summary.mult})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Remarks / Downtime */}
          <section className="print:break-inside-avoid mb-2 print:mb-0">
            <h2 className="text-base print:text-[11pt] font-black uppercase tracking-tight border-b-2 border-black pb-1 mb-2 print:mb-1 print:break-after-avoid">
              5. Remarks / Downtime
            </h2>
            {report.breakdowns && report.breakdowns.length > 0 && (
              <div className="mb-2 print:mb-1">
                <table className="w-full text-xs print:text-[9pt] border-2 border-black">
                  <thead className="bg-gray-100 border-b-2 border-black">
                    <tr>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-left border-r-2 border-black uppercase font-black w-1/4">
                        Section
                      </th>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-center border-r-2 border-black uppercase font-black w-1/4">
                        Downtime (Mins)
                      </th>
                      <th className="p-1.5 print:py-0.5 print:px-2 text-left uppercase font-black w-1/2">
                        Reason / Remark
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.breakdowns.map((b: any) => (
                      <tr key={b.id} className="border-b-2 border-black last:border-0 font-bold">
                        <td className="p-1.5 print:py-0.5 print:px-2 border-r-2 border-black uppercase">{b.section}</td>
                        <td className="p-1.5 print:py-0.5 print:px-2 text-center border-r-2 border-black text-red-600 print:text-black">
                          {b.downtime}
                        </td>
                        <td className="p-1.5 print:py-0.5 print:px-2 uppercase text-gray-700 print:text-black">
                          {b.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="bg-yellow-50 print:bg-white border-2 print:border border-yellow-200 print:border-black p-2.5 print:p-1.5 min-h-[35px] print:min-h-[25px] text-xs print:text-[9pt]">
              {report.remarks ? (
                <p className="font-bold text-yellow-900 print:text-black whitespace-pre-wrap leading-tight">
                  {report.remarks}
                </p>
              ) : (
                <p className="font-bold italic text-yellow-600/50 print:text-gray-400 print:text-black">
                  No general remarks provided.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* BOTTOM SIGNATURE */}
      <div className="print:break-inside-avoid px-4 sm:px-6 print:px-4 pb-6 print:pb-2 mt-6 print:mt-2">
        <div className="grid grid-cols-2 gap-12 sm:gap-24 print:gap-8">
          <div className="text-center flex flex-col items-center">
            <div className="h-20 print:h-12 w-full flex items-end justify-center border-b-2 border-black border-dashed mb-2 print:mb-1 relative">
              {report.preparedSignature ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={report.preparedSignature}
                  alt="Prepared Signature"
                  className="max-h-20 print:max-h-12 max-w-full object-contain mb-1 print:mb-0"
                />
              ) : (
                <span className="absolute bottom-1 print:bottom-0 left-0 right-0 text-gray-300 print:text-black italic text-sm print:text-[8pt]">
                  (Signature)
                </span>
              )}
            </div>
            <h4 className="font-black uppercase tracking-widest text-base print:text-[9pt] whitespace-nowrap leading-tight">
              {report.preparedBy}
            </h4>
            <p className="text-[10px] print:text-[7pt] font-bold uppercase tracking-wider text-gray-500 print:text-black">
              PREPARED BY
            </p>
          </div>

          <div className="text-center flex flex-col items-center">
            <div className="h-20 print:h-12 w-full flex items-end justify-center border-b-2 border-black border-dashed mb-2 print:mb-1 relative">
              {report.verifiedSignature ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={report.verifiedSignature}
                  alt="Verified Signature"
                  className="max-h-20 print:max-h-12 max-w-full object-contain mb-1 print:mb-0"
                />
              ) : (
                <span className="absolute bottom-1 print:bottom-0 left-0 right-0 text-gray-300 print:text-black italic text-sm print:text-[8pt]">
                  (Signature)
                </span>
              )}
            </div>
            <h4 className="font-black uppercase tracking-widest text-base print:text-[9pt] whitespace-nowrap leading-tight">
              {report.verifiedBy || "_____________________"}
            </h4>
            <p className="text-[10px] print:text-[7pt] font-bold uppercase tracking-wider text-gray-500 print:text-black">
              VERIFIED BY
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
