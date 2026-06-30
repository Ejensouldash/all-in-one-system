import React from "react"

export function GMPHeader({
  documentTitle = "STOCK TRANSFER FORM",
  documentNumber = "BOMSB-LNW-850-002-QR01"
}: {
  documentTitle?: string
  documentNumber?: string
} = {}) {
  return (
    <div className="w-full bg-white mb-8 overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse border-2 border-black text-xs md:text-sm text-black font-sans bg-white">
        <tbody>
          <tr>
            <td className="border-2 border-black p-4 text-center w-[20%]">
              <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2 Logo" className="h-12 mx-auto object-contain" />
            </td>
            <td className="border-2 border-black p-2 text-center font-bold w-[30%]">
              Document Type: Level 4<br />SUPPORTING DOCUMENTATION
            </td>
            <td className="border-2 border-black p-2 text-center font-bold w-[25%] uppercase">
              Document Title:<br />{documentTitle}
            </td>
            <td className="border-2 border-black p-2 text-center font-bold w-[25%]">
              Document Number:<br />{documentNumber}
            </td>
          </tr>
          <tr>
            <td className="border-2 border-black p-2 text-center font-medium">
              Co. No. 201401003259<br />(1079333-K)
            </td>
            <td colSpan={2} className="border-2 border-black p-2 text-center font-bold uppercase">
              HEAD OF LOGISTICS AND WAREHOUSE<br />
              BUBBLES O2 MARKETING SDN BHD (BOMSB)
            </td>
            <td className="border-2 border-black p-0 align-top">
              <table className="w-full h-full border-collapse">
                <tbody>
                  <tr>
                    <td className="p-1 pl-2 font-bold border-b-2 border-black">Page: <span className="font-normal ml-1">1 of 1</span></td>
                  </tr>
                  <tr>
                    <td className="p-1 pl-2 font-bold border-b-2 border-black">Issue: <span className="font-normal ml-1">03</span></td>
                  </tr>
                  <tr>
                    <td className="p-1 pl-2 font-bold">Date: <span className="font-normal ml-1">08/12/2025</span></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
