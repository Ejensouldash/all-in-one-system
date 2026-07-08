import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PrintButton from "./PrintButton"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"

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

      {/* A4 Print Layout */}
      <div className="max-w-[210mm] mx-auto p-[10mm] print:p-0 print:max-w-none print:m-0">
        <div className="flex flex-wrap gap-4 print:gap-2 justify-center print:justify-start">
          {assets.map((asset) => {
            const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bubbleso2-aio.vercel.app'}/public/asset/${asset.id}`

            return (
              <AssetQRSticker 
                key={asset.id} 
                assetTag={asset.assetTag} 
                qrValue={qrUrl} 
              />
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
