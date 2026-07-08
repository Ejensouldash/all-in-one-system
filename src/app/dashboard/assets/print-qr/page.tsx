import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import QRCode from "react-qr-code"
import PrintButton from "./PrintButton"

export default async function PrintQRPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  
  if (!resolvedSearchParams.ids) {
    return <div className="p-10 text-center font-bold text-red-500">No assets selected for printing.</div>
  }

  const ids = resolvedSearchParams.ids.split(',')
  
  const assets = await prisma.asset.findMany({
    where: {
      id: { in: ids }
    },
    include: {
      department: true
    }
  })

  if (assets.length === 0) {
    notFound()
  }

  return (
    <div className="bg-white min-h-screen text-black">
      {/* Print Controls (hidden on print) */}
      <div className="print:hidden p-6 bg-slate-100 border-b border-slate-200 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold">Print QR Codes</h1>
          <p className="text-sm text-slate-500">{assets.length} assets selected for printing (A4 Layout)</p>
        </div>
        <PrintButton />
      </div>

      {/* A4 Print Layout - 4 columns x 6 rows (24 per page) or similar depending on size. Let's do 3 columns x 5 rows to ensure it fits nicely on A4 */}
      <div className="max-w-[210mm] mx-auto p-[10mm] print:p-0 print:max-w-none print:m-0">
        <div className="grid grid-cols-3 gap-4 print:gap-2">
          {assets.map((asset) => {
            // URL format pointing to the public route
            const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bubbleso2-aio.vercel.app'}/public/asset/${asset.id}`

            return (
              <div key={asset.id} className="border-2 border-black rounded-xl p-3 flex items-center justify-between h-[3.5cm] break-inside-avoid">
                <div className="flex flex-col justify-between h-full overflow-hidden w-2/3 pr-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-tight truncate">Property of</h3>
                    <h2 className="font-black text-sm text-teal-700 truncate">Bubbles O2</h2>
                  </div>
                  
                  <div className="bg-slate-900 text-white rounded p-1 inline-block mt-1 mb-1">
                    <p className="font-bold text-sm text-center leading-none">{asset.assetTag}</p>
                  </div>

                  <div className="text-[8px] leading-tight font-medium text-slate-600">
                    <p className="truncate">T: +60 19-834 8993 (HQ)</p>
                    <p className="truncate">E: HR@bubbleso2.com</p>
                  </div>
                </div>
                
                <div className="bg-white p-1 rounded-lg border border-slate-200 w-1/3 flex-shrink-0 flex items-center justify-center">
                  <QRCode
                    value={qrUrl}
                    size={80}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Global styles for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}} />
    </div>
  )
}
