import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDailyReportById } from "@/app/actions/dailyReport"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, ClipboardList, Package, AlertTriangle } from "lucide-react"
import { PrintButton } from "@/components/ui/PrintButton"
import { ApprovalSignatureModal } from "@/components/forms/ApprovalSignatureModal"
import { ExportDailyReportButton } from "@/components/forms/ExportDailyReportButton"
import { SharePDFButton } from "@/components/ui/SharePDFButton"
import { prisma } from "@/lib/prisma"

export default async function ViewDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const resolvedParams = await params
  const response = await getDailyReportById(resolvedParams.id)
  const report = response.data

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 border-4 border-black text-center max-w-md w-full">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-black uppercase mb-2 text-black">Report Not Found</h1>
          <p className="text-gray-600 mb-6 font-bold">The report you are looking for does not exist or has been deleted.</p>
          <Link href="/forms" className="inline-block bg-black text-white font-black uppercase tracking-widest px-6 py-3 border-b-4 border-r-4 border-transparent hover:border-black hover:bg-white hover:text-black transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Fetch DO items to get starting quantities of auto-synced batches
  const allBatchNos = Array.from(new Set(report.inventory.map((i: any) => i.batchNo).filter(Boolean)))
  const doItems = await prisma.transferInItem.findMany({
    where: { batchNo: { in: allBatchNos as string[] } }
  })
  
  const doAggregated: Record<string, { bags: number, mult: number }> = {}
  doItems.forEach(item => {
    if (!doAggregated[item.batchNo]) {
      doAggregated[item.batchNo] = { bags: 0, mult: item.mult }
    }
    doAggregated[item.batchNo].bags += item.bags
  })

  // Helper to group inventory items by section
  const getInventoryForSection = (key: string) => report.inventory.filter((i: any) => i.sectionKey === key)

  // Fetch Transfer In for the same date
  const transferIns = await prisma.transferIn.findMany({
    where: { receiveDate: report.date },
    include: { items: true }
  })

  return (
    <div className="min-h-screen bg-gray-400 print:bg-white p-4 sm:p-8 print:p-0 print:m-0 font-sans pb-20 print:pb-0 flex flex-col items-center print:block">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          :root { color-scheme: light !important; }
          body, html { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background-color: white !important; 
            color: black !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            -webkit-box-decoration-break: clone !important;
            box-decoration-break: clone !important;
          }
        }
      `}</style>
      
      {/* Header Actions - Hidden on Print */}
      <div className="w-full max-w-[210mm] mb-6 flex flex-col sm:flex-row sm:items-center justify-between print:hidden gap-4">
        <div className="flex items-center">
          <Link href="/forms" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Link>
          <div className={`px-3 py-1.5 text-xs font-black uppercase border-2 flex items-center ${report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-800' : 'bg-yellow-100 text-yellow-800 border-yellow-800'}`}>
            {report.status === 'APPROVED' ? <CheckCircle2 className="w-4 h-4 mr-1.5"/> : <AlertTriangle className="w-4 h-4 mr-1.5"/>}
            {report.status}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {report.status === "PENDING" && (
            <>
              {((session.user as any).trueRole === "SUPERVISOR" || (session.user as any).trueRole === "SUPERADMIN") && (
                <ApprovalSignatureModal reportId={report.id} />
              )}
              
              <Link href={`/forms/production/daily-report/${report.id}/edit`} className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-indigo-600 text-indigo-600 px-4 py-2 bg-white hover:bg-indigo-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(79,70,229,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
                Edit Report
              </Link>
            </>
          )}
          <ExportDailyReportButton report={report} />
          <PrintButton />
          <SharePDFButton 
            elementId="daily-report-print-container" 
            filename={`Daily Production Report ${report.line.replace(' - ', ' ')} ${report.shift} Date ${new Date(report.date).toLocaleDateString('en-GB').replace(/\//g, '.')}.pdf`}
          />
        </div>
      </div>

      {/* SINGLE MASTER CONTAINER */}
      <div id="daily-report-print-container" className="print-container w-full max-w-[210mm] bg-white min-h-[297mm] print:min-h-0 print:box-border flex flex-col print:block shadow-[15px_15px_0px_0px_rgba(0,0,0,0.2)] print:shadow-none border-2 print:border-2 border-black print:border-black print:rounded-none print:bg-white print:text-black print:max-w-none mb-8 print:mb-0">
        
        {/* TOP CONTENT (Expands to fill space) */}
        <div className="flex flex-col print:block">
          
          {/* Official GMP Header */}
          <div className="border-b-[4px] print:border-b-2 border-black bg-white print:bg-transparent">
            <div className="flex flex-col divide-y-[3px] print:divide-y-2 divide-black print:divide-black">
              {/* Row 1: Company Info & Logo */}
              <div className="p-4 sm:p-6 print:p-2 flex justify-between items-center">
                <div>
                  <h2 className="font-black text-lg print:text-[12pt] tracking-tight uppercase text-black">Bubbles O2 Sdn Bhd</h2>
                  <p className="text-xs print:text-[10pt] font-bold text-gray-600 print:text-black leading-snug mt-1">
                    KOMPLEKS AL AMMAR,<br/>
                    KG KANCHONG,<br/>
                    71200, RANTAU,<br/>
                    NEGERI SEMBILAN
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.ico" alt="Bubbles O2 Logo" className="w-24 h-24 sm:w-28 sm:h-28 print:w-32 print:h-32 object-contain drop-shadow-sm print:shadow-none" />
              </div>

              {/* Row 2: Title */}
              <div className="p-4 sm:p-6 print:p-1 flex flex-col items-center justify-center text-center bg-blue-50/30 print:bg-transparent">
                <h1 className="text-xl sm:text-2xl print:text-[14pt] font-black uppercase tracking-tighter text-black leading-tight">
                  Daily Production Report ({report.line})
                </h1>
              </div>

              {/* Row 3: GMP Control Info Table */}
              <div className="flex flex-col text-xs print:text-[10pt] font-bold bg-white print:bg-transparent">
                <div className="flex border-b-2 border-black print:border-black items-stretch">
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 border-r-2 border-black print:border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">Rec. No</div>
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">SGMP/21/DPR1</div>
                </div>
                <div className="flex border-b-2 border-black print:border-black items-stretch">
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 border-r-2 border-black print:border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">Issue No</div>
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">1/10/22</div>
                </div>
                <div className="flex border-b-2 border-black print:border-black items-stretch">
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 border-r-2 border-black print:border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">Rev No</div>
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">4</div>
                </div>
                <div className="flex items-stretch">
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 border-r-2 border-black print:border-black bg-gray-50 print:bg-transparent flex items-center w-1/3 sm:w-1/4">Effective Date</div>
                  <div className="p-2 sm:p-3 print:py-0.5 print:px-2 font-black text-black flex-1 flex items-center">29/6/26</div>
                </div>
              </div>
            </div>
            
            {/* System Tag */}
            <div className="border-t-[3px] print:border-t-2 border-black print:border-black bg-gray-100 print:bg-transparent p-2 print:py-0.5 print:px-2 flex justify-between items-center text-[10px] print:text-[8pt] sm:text-xs font-black uppercase px-4 sm:px-6">
              <span className="text-gray-500 print:text-black">Generated via Digital Operations</span>
              <span className="text-gray-700 print:text-black bg-white print:bg-transparent print:border-none border border-gray-300 px-2 py-0.5 print:p-0">System ID: {report.id.split("-")[0]}</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 print:p-2 space-y-6 print:space-y-2 flex flex-col flex-1">
            
            {/* Section 1: Meta */}
            <section className="print:break-inside-avoid mb-6 print:mb-2">
              <h2 className="text-lg print:text-[12pt] font-black uppercase tracking-tight border-b-2 border-black print:border-black pb-1 mb-3 print:mb-1 print:break-after-avoid">1. Shift Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 print:grid-cols-6 gap-3 print:gap-2">
                <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-3 print:py-1 print:px-2">
                  <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5 print:mb-0">Date</p>
                  <p className="font-bold text-sm print:text-[10pt]">{new Date(report.date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-3 print:py-1 print:px-2">
                  <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5 print:mb-0">Time</p>
                  <p className="font-bold text-sm print:text-[10pt]">{report.time || "-"}</p>
                </div>
                <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-3 print:py-1 print:px-2">
                  <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5 print:mb-0">Shift</p>
                  <p className="font-black text-sm print:text-[10pt] text-blue-700 print:text-black">{report.shift}</p>
                </div>
                <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-3 print:py-1 print:px-2">
                  <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5 print:mb-0">Line</p>
                  <p className="font-bold text-sm print:text-[10pt]">{report.line}</p>
                </div>
                <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-3 print:py-1 print:px-2">
                  <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5 print:mb-0">Total Manpower</p>
                  <p className="font-bold text-sm print:text-[10pt]">{report.totalManpower ? `${report.totalManpower} / 10` : "-"}</p>
                </div>
                <div className="bg-gray-50 print:bg-transparent border border-gray-300 print:border-black p-3 print:py-1 print:px-2">
                  <p className="text-[10px] print:text-[8pt] font-black uppercase text-gray-500 print:text-black mb-0.5 print:mb-0">Prepared By</p>
                  <p className="font-bold text-sm print:text-[10pt] uppercase truncate" title={report.preparedBy}>{report.preparedBy}</p>
                </div>
              </div>
            </section>



            {/* TWO COLUMN WRAPPER FOR PRODUCTION AND REJECTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-2 print:break-inside-avoid">
              
              {/* Section 2: Production */}
              <section className="print:break-inside-avoid">
                <h2 className="text-lg print:text-[12pt] font-black uppercase tracking-tight border-b-2 border-black print:border-black pb-1 mb-3 print:mb-1 print:break-after-avoid">2. Production Output</h2>
                <div className="space-y-3 print:space-y-1">
                {report.productions.filter((prod: any) => prod.totalBox > 0).map((prod: any) => (
                  <div key={prod.id} className="border-2 print:border border-black print:border-black bg-white print:bg-transparent print:break-inside-avoid">
                    <div className="bg-gray-100 print:bg-transparent border-b-2 print:border-b border-black print:border-black p-3 print:py-0.5 print:px-2 font-black uppercase flex justify-between items-center text-sm print:text-[10pt]">
                      <span>{prod.productType.replace('p800_', '800ml x ').replace('p425_', '425ml x ')}</span>
                      <span className="bg-black text-white print:bg-transparent print:text-black print:border-l print:border-black px-3 print:px-1 py-1 print:py-0 text-sm print:text-[10pt]">{prod.totalBox} Box</span>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-sm print:text-[10pt]">
                        <thead className="bg-gray-50 print:bg-gray-100 print:text-black border-b border-gray-200 print:border-black">
                          <tr>
                            <th className="p-2 print:py-0.5 print:px-2 text-left font-bold text-gray-500 print:text-black uppercase text-xs print:text-[9pt]">Batch No</th>
                            <th className="p-2 print:py-0.5 print:px-2 text-center font-bold text-gray-500 print:text-black uppercase text-xs print:text-[9pt]">Type</th>
                            <th className="p-2 print:py-0.5 print:px-2 text-right font-bold text-gray-500 print:text-black uppercase text-xs print:text-[9pt]">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prod.batches.map((b: any) => (
                            <tr key={b.id} className="border-b border-gray-100 print:border-black last:border-0 last:print:border-0 font-bold">
                              <td className="p-2 print:py-0.5 print:px-2 uppercase">{b.batchNo}</td>
                              <td className="p-2 print:py-0.5 print:px-2 text-center text-blue-600 print:text-black">{b.type === 'Others' ? b.otherType : b.type}</td>
                              <td className="p-2 print:py-0.5 print:px-2 text-right">{b.qty} Box</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                </div>
              </section>

              {/* Section 3: Rejects */}
              <section className="print:break-inside-avoid">
                <h2 className="text-lg print:text-[12pt] font-black uppercase tracking-tight border-b-2 border-black print:border-black pb-1 mb-3 print:mb-1 print:break-after-avoid">3. Reject Logs</h2>
                <div className="grid grid-cols-1 gap-6">
                  {/* Table 1: Scrap */}
                  <div>
                    <h3 className="font-bold text-xs uppercase mb-1">Scrap / Disposal (Reject Terus)</h3>
                    <table className="w-full border-2 print:border border-black print:border-black text-xs print:text-[10pt]">
                      <thead className="bg-gray-100 print:bg-gray-100 print:text-black border-b-2 print:border-b border-black print:border-black">
                        <tr>
                          <th className="p-2 print:py-0.5 print:px-2 text-left border-r-2 print:border-r border-black print:border-black uppercase font-black">Item</th>
                          <th className="p-2 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black print:border-black uppercase font-black">Before</th>
                          <th className="p-2 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black print:border-black uppercase font-black">After</th>
                          <th className="p-2 print:py-0.5 print:px-2 text-center bg-gray-200 print:bg-transparent uppercase font-black">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rejects.filter((r: any) => r.type === "SCRAP" || !r.type).map((rej: any) => (
                          <tr key={rej.id} className="border-b-2 print:border-b border-black print:border-black font-bold last:border-0 last:print:border-0">
                            <td className="p-2 print:py-0.5 print:px-2 border-r-2 print:border-r border-black print:border-black uppercase">{rej.item}</td>
                            <td className="p-2 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black print:border-black text-gray-600 print:text-black">{rej.before}</td>
                            <td className="p-2 print:py-0.5 print:px-2 text-center border-r-2 print:border-r border-black print:border-black text-gray-600 print:text-black">{rej.after}</td>
                            <td className="p-2 print:py-0.5 print:px-2 text-center bg-gray-100 print:bg-transparent text-red-600 print:text-black font-black">{rej.before + rej.after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div> {/* END TWO COLUMN WRAPPER */}
            {/* Section 4: Inventory */}
            <section>
              <h2 className="text-lg print:text-[12pt] font-black uppercase tracking-tight border-b-2 border-black print:border-black pb-1 mb-3 print:mb-2 print:break-after-avoid">4. Inventory Summary</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-xs print:text-[8pt] border-collapse border-2 border-black print:border-black bg-white">
                  <thead className="bg-gray-100 print:bg-gray-100 font-black uppercase text-left border-b-2 border-black print:border-black leading-tight text-[10px] print:text-[8pt]">
                    <tr>
                      <th className="w-[15%] p-1.5 print:p-1 border-r-2 border-black align-top" rowSpan={2}>Material</th>
                      <th className="w-[25%] p-1.5 print:p-1 border-r-2 border-black align-top" rowSpan={2}>Transfer In (DO)</th>
                      <th className="w-[20%] p-1.5 print:p-1 border-r-2 border-black align-top" rowSpan={2}>Storeroom Balance</th>
                      <th className="w-[20%] p-1.5 print:p-1 border-r-2 border-b-2 border-black align-top text-center" colSpan={2}>Usage Log</th>
                      <th className="w-[20%] p-1.5 print:p-1 align-top" rowSpan={2}>Carry Forward</th>
                    </tr>
                    <tr>
                      <th className="w-[10%] p-1 print:p-0.5 border-r border-black bg-blue-50/50 print:bg-transparent text-center">Before</th>
                      <th className="w-[10%] p-1 print:p-0.5 border-r-2 border-black bg-blue-50/50 print:bg-transparent text-center">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['BOTTLE', 'LABEL', 'CAP', 'BOX_p800_12', 'BOX_p800_20', 'BOX_p425_24', 'BOX_p425_6'].map(key => {
                      
                      // 1. Hide boxes that were not ticked in Production
                      if (key.startsWith('BOX_')) {
                        const prodType = key.replace('BOX_', '');
                        const isProduced = report.productions.some((p: any) => p.productType === prodType);
                        if (!isProduced) return null;
                      }

                      const inv = getInventoryForSection(key)
                      if (inv.length === 0) return null;

                      // 2. Filter out empty default inputs from the form state
                      const sources = inv.filter((i: any) => i.type === 'Storeroom' && i.batchNo?.trim())
                      const usages = inv.filter((i: any) => i.type === 'Usage' && i.batchNo?.trim())
                      
                      const titleName = key.replace('p800_', '800ml ').replace('p425_', '425ml ')

                      // Filter transferIns for this section
                      const sectionDOItems = transferIns.flatMap(ti => ti.items.map(item => ({...item, doNumber: ti.doNumber}))).filter((item: any) => {
                        if (key === 'BOTTLE') return item.category.includes("BOTTLE");
                        if (key === 'LABEL') return item.category.includes("LABEL");
                        if (key === 'CAP') return item.category.includes("CAP");
                        if (key.startsWith('BOX_')) {
                          const multStr = key.split('_').pop();
                          return item.category.includes("BOX") && item.category.includes(multStr!);
                        }
                        return false;
                      });

                      const sectionBatchNos = Array.from(new Set([...sources.map((s:any)=>s.batchNo), ...usages.map((u:any)=>u.batchNo)]))
                      
                      const carryForwardSummaries: any[] = []
                      sectionBatchNos.forEach((batchNo: any) => {
                        const storeroomObj = sources.find((s:any) => s.batchNo === batchNo)
                        let startBags = 0
                        let mult = 1
                        
                        if (storeroomObj) {
                          startBags = storeroomObj.bags
                          mult = storeroomObj.mult
                        } else {
                          const doObj = doAggregated[batchNo]
                          if (doObj) {
                            startBags = doObj.bags
                            mult = doObj.mult
                          }
                        }
                        
                        const usedBags = usages.filter((u:any) => u.batchNo === batchNo).reduce((sum:number, u:any) => sum + u.bags, 0)
                        const carryFwdBags = startBags - usedBags
                        carryForwardSummaries.push({ batchNo, startBags, usedBags, carryFwdBags, mult })
                      })

                      return (
                        <tr key={key} className="border-b border-black print:border-black print:break-inside-avoid">
                          {/* 1. Material */}
                          <td className="p-2 print:p-1 border-r-2 border-black bg-emerald-50 print:bg-transparent font-black uppercase text-emerald-900 print:text-black align-top break-words text-[10px] print:text-[8pt]">
                            {titleName}
                          </td>
                          
                          {/* 2. Transfer In */}
                          <td className="p-2 print:p-1 border-r-2 border-black align-top break-words">
                            {sectionDOItems.length === 0 ? <span className="text-gray-400 italic font-normal text-[10px] print:text-[8pt]">Nil</span> : (
                              <div className="space-y-1.5">
                                {sectionDOItems.map((s: any) => (
                                  <div key={s.id} className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid">
                                    <div className="text-[8px] print:text-[6pt] text-gray-500 uppercase">{s.doNumber}</div>
                                    <div>{s.batchNo}</div>
                                    <div className="text-emerald-700 print:text-black">{s.bags} <span className="text-[8px] print:text-[6pt] text-gray-500">(x{s.mult})</span></div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* 3. Storeroom Balance */}
                          <td className="p-2 print:p-1 border-r-2 border-black align-top break-words">
                            {sources.length === 0 ? <span className="text-gray-400 italic font-normal text-[10px] print:text-[8pt]">Nil</span> : (
                              <div className="space-y-1.5">
                                {sources.map((s: any) => (
                                  <div key={s.id} className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid">
                                    <div>{s.batchNo} {s.labelType ? `(${s.labelType})` : ''}</div>
                                    <div>{s.bags} <span className="text-[8px] print:text-[6pt] text-gray-500">(x{s.mult})</span></div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* 4. Usage Before */}
                          <td className="p-2 print:p-1 border-r border-black align-top break-words">
                            <div className="space-y-1.5">
                              {usages.filter((u:any) => u.period === 'Before').map((u: any) => (
                                <div key={u.id} className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid">
                                  <div>{u.batchNo}</div>
                                  <div className="text-blue-700 print:text-black">{u.bags}</div>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* 5. Usage After */}
                          <td className="p-2 print:p-1 border-r-2 border-black align-top break-words">
                            <div className="space-y-1.5">
                              {usages.filter((u:any) => u.period === 'After').map((u: any) => (
                                <div key={u.id} className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-gray-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid">
                                  <div>{u.batchNo}</div>
                                  <div className="text-blue-700 print:text-black">{u.bags}</div>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* 6. Carry Forward */}
                          <td className="p-2 print:p-1 border-black align-top break-words bg-yellow-50/30 print:bg-transparent">
                            {carryForwardSummaries.length === 0 ? <span className="text-gray-400 italic font-normal text-[10px] print:text-[8pt]">Nil</span> : (
                              <div className="space-y-1.5">
                                {carryForwardSummaries.map((summary: any) => (
                                  <div key={summary.batchNo} className="text-[10px] print:text-[8pt] font-bold leading-tight border-b border-dashed border-yellow-200 print:border-gray-300 pb-1 last:border-0 last:pb-0 break-inside-avoid">
                                    <div className="uppercase mb-0.5">{summary.batchNo}</div>
                                    <div className="whitespace-nowrap bg-yellow-100 print:bg-transparent px-1 print:px-0 py-0.5 rounded text-[9px] print:text-[7pt] text-gray-800">
                                      Av: {summary.startBags} - {summary.usedBags} = <span className="font-black text-[10px] print:text-[8pt] text-black">{summary.carryFwdBags}</span>
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
            {/* Section 5: Remarks */}
            <section className="print:break-inside-avoid mb-4 print:mb-0">
              <h2 className="text-lg print:text-[11pt] font-black uppercase tracking-tight border-b-2 border-black print:border-black pb-1 mb-3 print:mb-1 print:break-after-avoid">5. Remarks / Downtime</h2>
              <div className="bg-yellow-50 print:bg-white border-2 print:border border-yellow-200 print:border-black p-3 print:p-1.5 min-h-[40px] print:min-h-[30px] text-xs print:text-[9pt]">
                {report.remarks ? (
                  <p className="font-bold text-yellow-900 print:text-black whitespace-pre-wrap leading-tight">{report.remarks}</p>
                ) : (
                  <p className="font-bold italic text-yellow-600/50 print:text-gray-400 print:text-black">No remarks provided.</p>
                )}
              </div>
            </section>

          </div>
        </div>

        {/* BOTTOM SIGNATURE (Follows content naturally) */}
        <div className="print:break-inside-avoid px-4 sm:px-6 print:px-4 pb-8 print:pb-2 mt-8 print:mt-3">
          <div className="grid grid-cols-2 gap-12 sm:gap-24 print:gap-8">
            {/* Prepared By Box */}
            <div className="text-center flex flex-col items-center">
              <div className="h-24 print:h-12 w-full flex items-end justify-center border-b-2 border-black print:border-black border-dashed mb-3 print:mb-1 relative">
                {report.preparedSignature ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={report.preparedSignature} alt="Prepared Signature" className="max-h-24 print:max-h-12 max-w-full object-contain mb-1 print:mb-0" />
                ) : (
                  <span className="absolute bottom-1 print:bottom-0 left-0 right-0 text-gray-300 print:text-black italic text-sm print:text-[8pt]">(Signature)</span>
                )}
              </div>
              <h4 className="font-black uppercase tracking-widest text-lg print:text-[9pt] whitespace-nowrap leading-tight">{report.preparedBy}</h4>
              <p className="text-xs print:text-[7pt] font-bold uppercase tracking-wider text-gray-500 print:text-black">Di Isi Oleh (Prepared By)</p>
            </div>

            {/* Verified By Box */}
            <div className="text-center flex flex-col items-center">
              <div className="h-24 print:h-12 w-full flex items-end justify-center border-b-2 border-black print:border-black border-dashed mb-3 print:mb-1 relative">
                {report.verifiedSignature ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={report.verifiedSignature} alt="Verified Signature" className="max-h-24 print:max-h-12 max-w-full object-contain mb-1 print:mb-0" />
                ) : (
                  <span className="absolute bottom-1 print:bottom-0 left-0 right-0 text-gray-300 print:text-black italic text-sm print:text-[8pt]">(Signature)</span>
                )}
              </div>
              <h4 className="font-black uppercase tracking-widest text-lg print:text-[9pt] whitespace-nowrap leading-tight">{report.verifiedBy || "_____________________"}</h4>
              <p className="text-xs print:text-[7pt] font-bold uppercase tracking-wider text-gray-500 print:text-black">Di Sahkan Oleh (Verified By)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
