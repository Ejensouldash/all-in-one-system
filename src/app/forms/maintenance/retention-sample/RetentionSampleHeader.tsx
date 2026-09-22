import React from "react"

interface RetentionSampleHeaderProps {
  monthName: string
  year: number
}

export function RetentionSampleHeader({ monthName, year }: RetentionSampleHeaderProps) {
  return (
    <header className="w-full bg-white text-black font-sans mb-4">
      {/* Upper Section: 3-column Document Control Box */}
      <table className="w-full border-collapse border-2 border-black text-xs">
        <tbody>
          <tr>
            {/* Left Box: BubblesO2 Official Logo */}
            <td className="border-2 border-black p-3 text-center w-[22%] align-middle bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/BubblesO2_Logo.png"
                alt="Bubbles O2 Logo"
                className="h-10 sm:h-12 mx-auto object-contain"
              />
            </td>

            {/* Center Box: Company Name and Official Address */}
            <td className="border-2 border-black p-3 font-bold w-[48%] align-middle bg-white">
              <div className="text-sm font-black tracking-tight text-gray-950">
                BUBBLES O2 SDN BHD
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-gray-700 leading-snug mt-1">
                KOMPLEKS AL AMMAR<br />
                KG KANCHONG<br />
                71200 RANTAU<br />
                NEGERI SEMBILAN
              </div>
            </td>

            {/* Right Box: Standard Document Control Information */}
            <td className="border-2 border-black p-0 w-[30%] align-top bg-white">
              <table className="w-full h-full border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-bold border-b border-black text-gray-900">
                      Rec. No : <span className="font-normal font-mono ml-1">SGMP/21/RSR</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-bold border-b border-black text-gray-900">
                      Issue No : <span className="font-normal font-mono ml-1">20/05/2025</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-bold border-b border-black text-gray-900">
                      Rev No : <span className="font-normal font-mono ml-1">1</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-bold text-gray-900">
                      Effective Date : <span className="font-normal font-mono ml-1">21/09/2026</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Document Title and Month Section */}
      <div className="text-center mt-4 mb-2">
        <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-black underline decoration-2 underline-offset-4">
          RETENTION SAMPLE RECORD
        </h1>
        <div className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-900">
          MONTH: <span className="font-black underline ml-1 px-3 py-0.5 border-b border-black">{monthName} {year}</span>
        </div>
      </div>
    </header>
  )
}
