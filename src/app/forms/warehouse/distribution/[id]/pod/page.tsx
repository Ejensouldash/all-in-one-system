"use client"
import { useEffect, useState, useSyncExternalStore } from "react"
import { QRCodeSVG } from "qrcode.react"

type PODItem = {
  id: string
  sku: string
  batchNumber?: string | null
  batchNo?: string | null
  qtySent: number
}

type PODOrder = {
  id: string
  doNumber: string
  distributionDate: string
  destination: string
  distributionMethod: string
  sponsorshipDetails?: string | null
  vehicleNo?: string | null
  driverName?: string | null
  createdBy?: { name: string } | null
  items: PODItem[]
}

export default function PrintPODPage({ params }: { params: Promise<{ id: string }> }) {
  const [doOrder, setDoOrder] = useState<PODOrder | "not_found" | null>(null)
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => ""
  )

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/warehouse/distribution/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data || data.error) setDoOrder('not_found')
          else setDoOrder(data)
        })
    })
  }, [params])

  if (doOrder === 'not_found') return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-xl font-bold">
      Distribution Order Not Found.
    </div>
  )
  if (!doOrder) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-lg animate-pulse">
      Loading document...
    </div>
  )

  // Aggregate items by SKU and Batch
  const aggregatedItems: Record<string, { qty: number, sku: string, batchNo: string }> = {}
  doOrder.items.forEach((item) => {
    const batch = item.batchNumber || item.batchNo || 'N/A'
    const key = `${item.sku}_${batch}`
    if (!aggregatedItems[key]) {
      aggregatedItems[key] = { qty: 0, sku: item.sku, batchNo: batch }
    }
    aggregatedItems[key].qty += item.qtySent
  })

  const labels: Record<string, string> = {
    "p425_24": "BUBBLES O2 Mineral Water 425 ML x 24",
    "p425_6":  "BUBBLES O2 Mineral Water 425 ML x 6",
    "p800_12": "BUBBLES O2 Mineral Water 800 ML x 12",
    "p800_20": "BUBBLES O2 Mineral Water 800 ML x 20",
  }

  const totalBoxes = Object.values(aggregatedItems).reduce((a, item) => a + item.qty, 0)
  const dateStr = new Date(doOrder.distributionDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        body {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          background: #f0f4f8;
          margin: 0;
        }

        .print-wrapper {
          background: #f0f4f8;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 16px;
        }

        .toolbar {
          width: 100%;
          max-width: 860px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .doc-paper {
          width: 100%;
          max-width: 860px;
          background: #ffffff;
          border-radius: 4px;
          box-shadow: 0 4px 40px rgba(0,0,0,0.18);
          overflow: hidden;
        }

        /* TOP ACCENT STRIPE */
        .accent-bar {
          height: 6px;
          background: linear-gradient(90deg, #003366 0%, #0066cc 50%, #00aaff 100%);
        }

        /* GMP ISO HEADER */
        .gmp-header {
          display: grid;
          grid-template-columns: 160px 1fr 200px 180px;
          border-bottom: 2px solid #1a1a2e;
        }

        .gmp-cell {
          padding: 10px 12px;
          border-right: 1px solid #1a1a2e;
          font-size: 9px;
          line-height: 1.5;
          color: #1a1a2e;
        }
        .gmp-cell:last-child { border-right: none; }

        .gmp-logo-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-right: 1px solid #1a1a2e;
          border-bottom: 1px solid #1a1a2e;
          row-span: 2;
        }

        .gmp-header-row2 {
          display: grid;
          grid-template-columns: 160px 1fr 180px;
          border-bottom: 2px solid #1a1a2e;
        }

        .gmp-mini-table {
          display: flex;
          flex-direction: column;
          border-left: 1px solid #1a1a2e;
        }
        .gmp-mini-row {
          padding: 3px 10px;
          border-bottom: 1px solid #1a1a2e;
          font-size: 9px;
          color: #1a1a2e;
        }
        .gmp-mini-row:last-child { border-bottom: none; }

        /* DOCUMENT TITLE BAND */
        .doc-title-band {
          background: #003366;
          padding: 18px 36px;
          text-align: center;
        }
        .doc-title-band h1 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0;
        }
        .doc-title-band p {
          color: #7eb8f7;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 4px 0 0 0;
        }

        /* BODY */
        .doc-body { padding: 28px 36px; }

        /* DO INFO CARD */
        .info-card {
          border: 1px solid #d1dbe8;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .info-card-header {
          background: #f5f8fc;
          border-bottom: 1px solid #d1dbe8;
          padding: 8px 16px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #4a6080;
        }
        .info-card-body {
          display: grid;
          grid-template-columns: 1fr 1fr 124px;
          gap: 0;
          padding: 14px 16px;
        }
        .info-row {
          display: flex;
          gap: 6px;
          align-items: baseline;
          padding: 3px 0;
          font-size: 10px;
        }
        .info-label {
          font-weight: 700;
          color: #4a6080;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          min-width: 90px;
          font-size: 8.5px;
        }
        .info-value {
          font-weight: 600;
          color: #1a1a2e;
          font-size: 10.5px;
        }

        /* ITEMS TABLE */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .items-table thead tr {
          background: #003366;
        }
        .items-table thead th {
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 10px 14px;
          text-align: left;
        }
        .items-table thead th:last-child { text-align: center; }

        .items-table tbody tr {
          border-bottom: 1px solid #e8eef5;
        }
        .items-table tbody tr:nth-child(even) {
          background: #f9fbfd;
        }
        .items-table tbody td {
          padding: 11px 14px;
          font-size: 10.5px;
          color: #1a1a2e;
          font-weight: 500;
        }
        .items-table tbody td.qty-col {
          text-align: center;
          font-weight: 800;
          font-size: 13px;
          color: #003366;
        }
        .items-table tfoot td {
          padding: 10px 14px;
          background: #f5f8fc;
          border-top: 2px solid #003366;
          font-size: 10px;
          font-weight: 800;
          color: #003366;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table tfoot td.total-qty {
          text-align: center;
          font-size: 15px;
          color: #003366;
        }

        /* METHOD BADGE */
        .method-badge {
          display: inline-block;
          background: #e8f0fc;
          color: #003366;
          border: 1px solid #b8ccee;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* SIGNATURE SECTION */
        .sig-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-top: 24px;
        }
        .sig-box {
          border: 1px solid #d1dbe8;
          border-radius: 4px;
          padding: 14px 16px 10px;
          height: 130px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .sig-box-label {
          position: absolute;
          top: -9px;
          left: 14px;
          background: white;
          padding: 0 6px;
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #4a6080;
        }
        .sig-stamp-circle {
          position: absolute;
          top: 14px;
          right: 18px;
          width: 64px;
          height: 64px;
          border: 1.5px dashed #b8ccee;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .sig-stamp-circle span {
          font-size: 7px;
          color: #b8ccee;
          font-weight: 600;
          text-transform: uppercase;
          line-height: 1.3;
        }
        .sig-name-line {
          border-top: 1px solid #1a1a2e;
          padding-top: 5px;
          font-size: 9.5px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .sig-name-sub {
          font-size: 9px;
          color: #4a6080;
          margin-top: 2px;
        }

        /* FOOTER */
        .doc-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e8eef5;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .doc-footer span {
          font-size: 8px;
          color: #9aaabb;
          letter-spacing: 0.5px;
        }

        /* PRINT STYLES */
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body { background: white !important; }
          .print-wrapper { background: white !important; padding: 0 !important; }
          .toolbar { display: none !important; }
          .doc-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .doc-body { padding: 20px 28px; }
        }
      `}</style>

      <div className="print-wrapper">
        {/* Screen-only toolbar */}
        <div className="toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#003366' }}>
              Distribution Order
            </span>
            <span style={{
              background: '#003366', color: 'white',
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 3, letterSpacing: 1
            }}>
              {doOrder.doNumber}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.history.back()}
              style={{
                background: 'transparent', border: '1px solid #d1dbe8',
                color: '#4a6080', fontWeight: 600, padding: '8px 18px',
                borderRadius: 4, cursor: 'pointer', fontSize: 12
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => window.print()}
              style={{
                background: '#003366', color: 'white',
                fontWeight: 700, padding: '8px 22px',
                borderRadius: 4, cursor: 'pointer', fontSize: 12,
                letterSpacing: 1, border: 'none'
              }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        {/* DOCUMENT */}
        <div className="doc-paper">
          {/* Top accent stripe */}
          <div className="accent-bar" />

          {/* GMP ISO HEADER - Row 1 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 210px 180px',
            borderBottom: '1px solid #1a1a2e'
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '12px',
              borderRight: '1px solid #1a1a2e',
              gridRow: '1 / 3'
            }}>
              <img
                src="/assets/BubblesO2_Logo.png"
                alt="BubblesO2"
                style={{ height: 52, objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '8px 12px', borderRight: '1px solid #1a1a2e', textAlign: 'center', fontSize: 9, lineHeight: 1.6 }}>
              <strong>Document Type: Level 4</strong><br />SUPPORTING DOCUMENTATION
            </div>
            <div style={{ padding: '8px 12px', borderRight: '1px solid #1a1a2e', textAlign: 'center', fontSize: 9, lineHeight: 1.6 }}>
              <strong>Document Title:</strong><br />STOCK TRANSFER FORM
            </div>
            <div style={{ padding: '8px 12px', textAlign: 'center', fontSize: 9, lineHeight: 1.6 }}>
              <strong>Document Number:</strong><br />BOMSB-LNW-850-002-QR01
            </div>
          </div>
          {/* GMP ISO HEADER - Row 2 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 180px',
            borderBottom: '2px solid #1a1a2e'
          }}>
            <div style={{
              padding: '8px 12px', borderRight: '1px solid #1a1a2e',
              textAlign: 'center', fontSize: 9, lineHeight: 1.6
            }}>
              Co. No. 201401003259<br />(1079333-K)
            </div>
            <div style={{
              padding: '8px 12px', borderRight: '1px solid #1a1a2e',
              textAlign: 'center', fontSize: 9, fontWeight: 700, lineHeight: 1.6
            }}>
              HEAD OF LOGISTICS AND WAREHOUSE<br />
              BUBBLES O2 MARKETING SDN BHD (BOMSB)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '4px 10px', borderBottom: '1px solid #1a1a2e', fontSize: 9 }}>
                <strong>Page:</strong> 1 of 1
              </div>
              <div style={{ padding: '4px 10px', borderBottom: '1px solid #1a1a2e', fontSize: 9 }}>
                <strong>Issue:</strong> 03
              </div>
              <div style={{ padding: '4px 10px', fontSize: 9 }}>
                <strong>Date:</strong> 08/12/2025
              </div>
            </div>
          </div>

          {/* DOCUMENT TITLE BAND */}
          <div className="doc-title-band">
            <h1>Stock Transfer Form</h1>
            <p>Bubbles O2 Marketing Sdn Bhd (BOMSB) &mdash; Warehouse & Distribution</p>
          </div>

          {/* DOCUMENT BODY */}
          <div className="doc-body">

            {/* DO Info Card */}
            <div className="info-card">
              <div className="info-card-header">Distribution Order Details</div>
              <div className="info-card-body">
              <div>
                  <div className="info-row">
                    <span className="info-label">DO Number</span>
                    <span className="info-value" style={{ color: '#003366', fontWeight: 800 }}>{doOrder.doNumber}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Transfer Date</span>
                    <span className="info-value">{dateStr}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Method</span>
                    <span className="method-badge">{doOrder.distributionMethod}</span>
                  </div>
                  {doOrder.distributionMethod === 'Sponsorship' && doOrder.sponsorshipDetails && (
                    <div className="info-row">
                      <span className="info-label">Sponsor To</span>
                      <span className="info-value">{doOrder.sponsorshipDetails}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="info-row">
                    <span className="info-label">Transfer To</span>
                    <span className="info-value" style={{ fontWeight: 700 }}>{doOrder.destination}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Vehicle No</span>
                    <span className="info-value">{doOrder.vehicleNo || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Driver</span>
                    <span className="info-value">{doOrder.driverName || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Prepared By</span>
                    <span className="info-value">{doOrder.createdBy?.name}</span>
                  </div>
                </div>
                <div style={{
                  borderLeft: '1px solid #d1dbe8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', paddingLeft: 14, marginLeft: 8
                }}>
                  {origin ? (
                    <QRCodeSVG
                      value={`${origin}/forms/warehouse/trace/do/${doOrder.id}`}
                      size={86}
                      level="H"
                      includeMargin={false}
                    />
                  ) : <div style={{ width: 86, height: 86, background: '#f5f8fc' }} />}
                  <span style={{ marginTop: 5, fontSize: 7, fontWeight: 800, letterSpacing: 0.8, color: '#003366', textTransform: 'uppercase', textAlign: 'center' }}>
                    Scan DO Tracking
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>No.</th>
                  <th>Item Description</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Quantity (Box)</th>
                  <th style={{ width: 58, textAlign: 'center' }}>Batch QR</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(aggregatedItems).map((item, idx) => (
                  <tr key={`${item.sku}_${item.batchNo}`}>
                    <td style={{ textAlign: 'center', color: '#4a6080', fontWeight: 600 }}>{idx + 1}</td>
                    <td>{labels[item.sku] || item.sku} - {item.batchNo}</td>
                    <td className="qty-col">{item.qty as React.ReactNode}</td>
                    <td style={{ textAlign: 'center' }}>
                      {origin && (
                        <QRCodeSVG
                          value={`${origin}/forms/warehouse/inventory/batch/${encodeURIComponent(item.batchNo)}?sku=${encodeURIComponent(item.sku)}&batch=${encodeURIComponent(item.batchNo)}&v=2`}
                          size={34}
                          level="M"
                          includeMargin={false}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {Object.entries(aggregatedItems).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#9aaabb', fontStyle: 'italic', fontSize: 11 }}>
                      No items recorded.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total</td>
                  <td className="total-qty">{totalBoxes}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            {/* Remarks */}
            <div style={{
              marginTop: 16, padding: '8px 12px',
              background: '#f9fbfd', border: '1px dashed #d1dbe8',
              borderRadius: 4, fontSize: 9, color: '#4a6080'
            }}>
              <strong>REMARKS / NOTES:</strong>&nbsp;&nbsp;
              <span style={{ borderBottom: '1px solid #d1dbe8', display: 'inline-block', minWidth: 400 }}>&nbsp;</span>
            </div>

            {/* Signature Section */}
            <div className="sig-section">
              <div className="sig-box">
                <span className="sig-box-label">Sender Information</span>
                <div className="sig-stamp-circle">
                  <span>BUBBLES O2<br/>SDN BHD<br/>STAMP</span>
                </div>
                <div>
                  <div className="sig-name-line">Name &amp; Signature</div>
                  <div className="sig-name-sub">{doOrder.createdBy?.name}</div>
                </div>
              </div>

              <div className="sig-box">
                <span className="sig-box-label">Transporter / Driver</span>
                <div style={{ flex: 1, minHeight: 60 }} />
                <div>
                  <div className="sig-name-line">Name &amp; Signature / Lorry No</div>
                  <div className="sig-name-sub">{doOrder.driverName || '\u00A0'} / {doOrder.vehicleNo || '\u00A0'}</div>
                </div>
              </div>

              <div className="sig-box">
                <span className="sig-box-label">Recipient Information</span>
                <div className="sig-stamp-circle">
                  <span>COMPANY<br/>STAMP</span>
                </div>
                <div>
                  <div className="sig-name-line">Name &amp; Signature / Cop</div>
                  <div className="sig-name-sub">&nbsp;</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="doc-footer">
              <span>BOMSB-LNW-850-002-QR01 | Issue 03 | Date: 08/12/2025</span>
              <span>Generated: {new Date().toLocaleString('en-GB')}</span>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
