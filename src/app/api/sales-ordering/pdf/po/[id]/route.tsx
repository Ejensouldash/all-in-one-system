import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import React from "react"
import { Page, Text, View, Document, StyleSheet, renderToStream, Image, Font } from "@react-pdf/renderer"
import path from "path"
import { ExtractedSalesDocument } from "@/lib/sales-ordering/types"

// Register standard fonts to ensure beautiful rendering
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 }
  ]
})

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Open Sans', fontSize: 9, color: '#334155', backgroundColor: '#ffffff' },
  topBar: { height: 6, backgroundColor: '#0284c7', marginBottom: 20, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, pb: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  logo: { width: 140, height: 48, objectFit: 'contain' },
  titleBox: { alignItems: 'flex-end' },
  title: { fontSize: 22, fontWeight: 700, color: '#0369a1', letterSpacing: 0.5, marginBottom: 4 },
  poBadge: { backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: 9, fontWeight: 700, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 2 },
  dateText: { fontSize: 9, color: '#64748b', marginTop: 4 },
  
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 15 },
  infoCard: { width: '48%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 8, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  companyName: { fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 3 },
  infoText: { fontSize: 9, color: '#475569', lineHeight: 1.4 },
  
  table: { width: '100%', marginBottom: 20, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0284c7', paddingVertical: 7, paddingHorizontal: 8 },
  tableHeaderCell: { fontSize: 8, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center' },
  tableRowEven: { backgroundColor: '#f8fafc' },
  
  colNo: { width: '8%', textAlign: 'center' },
  colDesc: { width: '44%' },
  colQty: { width: '14%', textAlign: 'center' },
  colPrice: { width: '17%', textAlign: 'right' },
  colAmount: { width: '17%', textAlign: 'right' },
  
  colText: { fontSize: 9, color: '#334155' },
  colTextBold: { fontSize: 9, fontWeight: 700, color: '#0f172a' },

  bottomSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  notesBox: { width: '54%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  notesTitle: { fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  notesContent: { fontSize: 8, color: '#64748b', lineHeight: 1.4 },

  totalsBox: { width: '42%', backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 9, color: '#475569' },
  summaryValue: { fontSize: 9, fontWeight: 700, color: '#0f172a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#7dd3fc', paddingTop: 6, marginTop: 4 },
  grandTotalLabel: { fontSize: 10, fontWeight: 700, color: '#0369a1' },
  grandTotalValue: { fontSize: 13, fontWeight: 700, color: '#0284c7' },

  footer: { position: 'absolute', bottom: 25, left: 36, right: 36, textAlign: 'center', fontSize: 7, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 }
})

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(val)

const POTemplate = ({ data, logoPath }: { data: any, logoPath: string }) => {
  const extracted = data.extractedData as ExtractedSalesDocument
  const lines = extracted.lines || (extracted as any).items || []
  const subtotal = lines.reduce((acc, line) => acc + Number(line.amount || (line as any).totalPrice || 0), 0)
  const grandTotal = Number(extracted.totals?.grandTotal || subtotal)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

        {/* Header */}
        <View style={styles.header}>
          {logoPath && <Image src={logoPath} style={styles.logo} />}
          <View style={styles.titleBox}>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <View style={styles.poBadge}>
              <Text>PO NO: {extracted.poNumber || "PENDING-SOA"}</Text>
            </View>
            <Text style={styles.dateText}>Tarikh Pesanan: {extracted.documentDate || data.createdAt.toISOString().slice(0, 10)}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Penerima Pesanan (Vendor / Pembekal)</Text>
            <Text style={styles.companyName}>BUBBLESO2 SDN BHD</Text>
            <Text style={styles.infoText}>Jabatan Pengurusan Jualan & SOA</Text>
            <Text style={styles.infoText}>Sistem Pengurusan Pesanan Dalaman (AIO)</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Maklumat Pelanggan / Pemohon</Text>
            <Text style={styles.companyName}>{extracted.customerName || "Nama Pelanggan Tidak Dinyatakan"}</Text>
            <Text style={styles.infoText}>Pusat Sumber: Google Form Manual Intake</Text>
            <Text style={styles.infoText}>Dimuat Naik Oleh: {data.uploadedBy?.name || "Manual Webhook"}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colNo}><Text style={styles.tableHeaderCell}>NO</Text></View>
            <View style={styles.colDesc}><Text style={styles.tableHeaderCell}>PERIHAL / SKU BARANGAN</Text></View>
            <View style={styles.colQty}><Text style={styles.tableHeaderCell}>KUANTITI</Text></View>
            <View style={styles.colPrice}><Text style={styles.tableHeaderCell}>HARGA (RM)</Text></View>
            <View style={styles.colAmount}><Text style={styles.tableHeaderCell}>JUMLAH (RM)</Text></View>
          </View>
          
          {lines.length > 0 ? lines.map((lineItem: any, index: number) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]}>
              <View style={styles.colNo}><Text style={styles.colText}>{index + 1}</Text></View>
              <View style={styles.colDesc}>
                <Text style={styles.colTextBold}>{lineItem.sku || lineItem.itemCode || lineItem.productCode || "SKU PRODUK"}</Text>
                {lineItem.description ? <Text style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>{lineItem.description}</Text> : null}
              </View>
              <View style={styles.colQty}><Text style={styles.colTextBold}>{lineItem.quantity}</Text></View>
              <View style={styles.colPrice}><Text style={styles.colText}>{formatCurrency(lineItem.unitPrice || 0)}</Text></View>
              <View style={styles.colAmount}><Text style={styles.colTextBold}>{formatCurrency(lineItem.amount ?? lineItem.totalPrice ?? 0)}</Text></View>
            </View>
          )) : (
            <View style={styles.tableRow}>
              <View style={{ width: '100%', textAlign: 'center', paddingVertical: 10 }}>
                <Text style={styles.colText}>Tiada senarai barangan direkodkan.</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Section (Notes + Totals) */}
        <View style={styles.bottomSection}>
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Terma & Nota Pesanan</Text>
            <Text style={styles.notesContent}>1. Dokumen ini merupakan janaan rasmi dari borang tempahan manual.</Text>
            <Text style={styles.notesContent}>2. Tertakluk kepada semakan kredit dan kelulusan SOA sebelum penghantaran stok.</Text>
            <Text style={styles.notesContent}>3. Sila semak semula harga dan kuantiti dengan Team BD jika terdapat sebarang kemaskini.</Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sub-Jumlah:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cukai / Kos Lain:</Text>
              <Text style={styles.summaryValue}>RM 0.00</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>JUMLAH BERSIH:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>BubblesO2 All-in-One System · Dokumen Ini Dijana Secara Komputer Dan Sah Tanpa Tandatangan Manual</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
      include: { uploadedBy: { select: { name: true } } }
    })

    if (!intake) {
      return new NextResponse("Intake not found", { status: 404 })
    }

    const logoPath = path.join(process.cwd(), 'public', 'assets', 'BubblesO2_Logo.png')
    const pdfStream = await renderToStream(<POTemplate data={intake} logoPath={logoPath} />)

    // Convert NodeJS Readable stream to Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', chunk => controller.enqueue(chunk))
        pdfStream.on('end', () => controller.close())
        pdfStream.on('error', err => controller.error(err))
      }
    })

    const extracted = intake.extractedData as ExtractedSalesDocument
    const filename = `PO_${extracted.poNumber || "DRAFT"}.pdf`

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error("PDF Generation Error:", error)
    return new NextResponse("Failed to generate PDF", { status: 500 })
  }
}
