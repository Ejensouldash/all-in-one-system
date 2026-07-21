import React from "react"

interface MaintenanceHeaderProps {
  title: string
  recNo: string
  issueNo?: string
  revNo?: string
  effectiveDate?: string
}

export function MaintenanceHeader({
  title,
  recNo,
  issueNo = "1/10/2022",
  revNo = "1",
  effectiveDate = "1/7/2026"
}: MaintenanceHeaderProps) {
  return (
    <div className="w-full bg-white mb-6 font-sans text-black">
      <table className="w-full border-collapse border-2 border-black text-[11px] rounded-none">
        <tbody>
          <tr>
            <td className="border-2 border-black p-3 text-center w-[20%] align-middle" rowSpan={4}>
              <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2 Logo" className="h-10 mx-auto object-contain" />
            </td>
            <td className="border-2 border-black p-2 font-bold w-[50%] align-middle" rowSpan={4}>
              BUBBLESO2 SDN BHD<br />
              <span className="font-normal text-[9px] text-gray-500 leading-tight block mt-1">
                KOMPLEKS AL-AMMAR,<br />
                KG KANCHONG, 71200, RANTAU,<br />
                NEGERI SEMBILAN.
              </span>
            </td>
            <td className="border-2 border-black px-2 py-0.5 font-bold w-[30%]">
              Rec. No : <span className="font-normal ml-1">{recNo}</span>
            </td>
          </tr>
          <tr>
            <td className="border-2 border-black px-2 py-0.5 font-bold">
              Issue No : <span className="font-normal ml-1">{issueNo}</span>
            </td>
          </tr>
          <tr>
            <td className="border-2 border-black px-2 py-0.5 font-bold">
              Rev No : <span className="font-normal ml-1">{revNo}</span>
            </td>
          </tr>
          <tr>
            <td className="border-2 border-black px-2 py-0.5 font-bold">
              Effective date : <span className="font-normal ml-1">{effectiveDate}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-center my-6">
        <h2 className="text-base font-black uppercase tracking-wider underline decoration-2">{title}</h2>
      </div>
    </div>
  )
}
