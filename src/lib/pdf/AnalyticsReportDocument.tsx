import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import { SKU_COLORS, type AnalyticsPayload, type ExecutiveSummary, type StoreroomReport } from "@/lib/analytics/types"
import {
  StackedBarChart,
  HorizontalBars,
  ParetoChart,
  TrendChart,
  DonutChart,
  CoverageStrip,
} from "./chartPrimitives"

const REJECT_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"]

const nf = (n: number) => Math.round(n).toLocaleString("en-MY")
const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
const dm = (iso: string) => {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

/**
 * A batch can be fed by a dozen DOs, and printing all of them makes the row three lines tall.
 * Show the first two and count the rest — the Excel export carries the full list.
 */
function shortDo(doNumber: string): string {
  const parts = (doNumber || "").split(",").map(p => p.trim()).filter(Boolean)
  if (parts.length <= 2) return parts.join(", ") || "-"
  return `${parts.slice(0, 2).join(", ")} (+${parts.length - 2} lagi)`
}

const C = {
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  brand: "#4f46e5",
  brandSoft: "#eef2ff",
  good: "#059669",
  goodSoft: "#ecfdf5",
  warn: "#d97706",
  warnSoft: "#fffbeb",
  bad: "#dc2626",
  badSoft: "#fef2f2",
}

const s = StyleSheet.create({
  page: { paddingTop: 62, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: C.body, fontFamily: "Helvetica" },
  coverPage: { padding: 0, fontSize: 9, color: C.body, fontFamily: "Helvetica" },

  runHeader: {
    position: "absolute", top: 0, left: 0, right: 0, height: 46,
    paddingHorizontal: 40, paddingTop: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  runHeaderLogo: { height: 18, objectFit: "contain" },
  runHeaderText: { fontSize: 7, color: C.faint, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  runFooter: {
    position: "absolute", bottom: 22, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6,
  },
  runFooterText: { fontSize: 7, color: C.faint },

  coverBand: { backgroundColor: C.ink, paddingHorizontal: 48, paddingTop: 54, paddingBottom: 40 },
  coverLogo: { height: 40, objectFit: "contain", marginBottom: 26 },
  coverEyebrow: { fontSize: 8, color: "#a5b4fc", fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase" },
  coverTitle: { fontSize: 30, color: "#ffffff", fontFamily: "Helvetica-Bold", marginTop: 12, lineHeight: 1.15 },
  coverRule: { width: 54, height: 3, backgroundColor: C.brand, marginTop: 18 },
  coverBody: { paddingHorizontal: 48, paddingTop: 34 },
  coverPeriodLabel: { fontSize: 8, color: C.faint, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1 },
  coverPeriod: { fontSize: 17, color: C.ink, fontFamily: "Helvetica-Bold", marginTop: 5 },
  coverHeadline: { fontSize: 10, color: C.body, marginTop: 22, lineHeight: 1.6 },

  coverStats: { flexDirection: "row", marginTop: 30, gap: 10 },
  coverStat: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 5, padding: 11 },
  coverStatValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.ink },
  coverStatLabel: { fontSize: 6.5, color: C.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 },

  coverMetaBox: { marginTop: 34, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14 },
  coverMetaRow: { flexDirection: "row", marginBottom: 4 },
  coverMetaKey: { width: 108, fontSize: 8, color: C.faint, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  coverMetaVal: { fontSize: 8, color: C.body, flex: 1 },

  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 3 },
  h1Rule: { width: 34, height: 2.5, backgroundColor: C.brand, marginBottom: 12 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 16, marginBottom: 7 },
  p: { fontSize: 9, lineHeight: 1.55, color: C.body, marginBottom: 5 },
  note: { fontSize: 7.5, color: C.faint, lineHeight: 1.45, marginTop: 5 },

  bullet: { flexDirection: "row", marginBottom: 4, paddingRight: 6 },
  bulletDot: { width: 11, fontSize: 9, color: C.brand, fontFamily: "Helvetica-Bold" },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: C.body },

  tocRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 9 },
  tocNum: { width: 20, fontSize: 9, fontFamily: "Helvetica-Bold", color: C.brand },
  tocLabel: { fontSize: 9.5, color: C.ink, fontFamily: "Helvetica-Bold" },
  tocDots: { flex: 1, borderBottomWidth: 0.7, borderBottomColor: C.line, borderBottomStyle: "dotted", marginHorizontal: 6, marginBottom: 2.5 },
  tocPage: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.muted },
  tocDesc: { fontSize: 7.5, color: C.faint, marginLeft: 20, marginTop: -6, marginBottom: 9 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  kpiCard: { width: "31.6%", borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 6.5, color: C.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 3 },
  kpiSub: { fontSize: 6.5, color: C.faint, marginTop: 1.5 },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4, marginTop: 6, overflow: "hidden" },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.line, minHeight: 17, alignItems: "center" },
  trLast: { borderBottomWidth: 0 },
  thead: { backgroundColor: "#f8fafc" },
  th: { fontSize: 6.8, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, paddingVertical: 5, paddingHorizontal: 6 },
  td: { fontSize: 8, color: C.body, paddingVertical: 4.5, paddingHorizontal: 6 },
  tdB: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, paddingVertical: 4.5, paddingHorizontal: 6 },
  right: { textAlign: "right" },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 7, height: 7, borderRadius: 1.5 },
  legendText: { fontSize: 7, color: C.muted, fontFamily: "Helvetica-Bold" },

  callout: { borderWidth: 1, borderRadius: 4, padding: 10, marginTop: 8 },
  calloutLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  calloutTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 4 },
  calloutValue: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  calloutLine: { fontSize: 7.5, marginTop: 3 },

  twoCol: { flexDirection: "row", gap: 12 },
  chartWrap: { marginTop: 4 },
})

// ---------------------------------------------------------------------------------------------

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View>
      <Text style={s.h1}>{title}</Text>
      <View style={s.h1Rule} />
    </View>
  )
}

function RunningHeader({ logo, range }: { logo: string; range: string }) {
  return (
    <View style={s.runHeader} fixed>
      <Image src={logo} style={s.runHeaderLogo} />
      <Text style={s.runHeaderText}>Laporan Analitik Pengeluaran · {range}</Text>
    </View>
  )
}

function RunningFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.runFooter} fixed>
      <Text style={s.runFooterText}>BubblesO2 AIO System · Dijana {generatedAt}</Text>
      <Text style={s.runFooterText} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={s.legendRow}>
      {items.map(i => (
        <View key={i.label} style={s.legendItem}>
          <View style={[s.legendSwatch, { backgroundColor: i.color }]} />
          <Text style={s.legendText}>{i.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------------------------

const TOC = [
  { id: "exec", n: "1", label: "Executive Summary", desc: "Gambaran keseluruhan, penemuan utama, risiko dan cadangan" },
  { id: "overall", n: "2", label: "Prestasi Keseluruhan", desc: "Petunjuk prestasi utama dan trend pengeluaran harian" },
  { id: "sku", n: "3", label: "Analisis Output Ikut SKU", desc: "Pecahan 800ml x 20/12 dan 425ml x 24/6" },
  { id: "shift", n: "4", label: "Analisis Shift & Line", desc: "Perbandingan AM lawan PM dan prestasi setiap line" },
  { id: "extremes", n: "5", label: "Hari Tertinggi & Terendah", desc: "Hari pengeluaran terbaik dan terburuk dalam tempoh" },
  { id: "problems", n: "6", label: "Masalah & Downtime", desc: "Downtime ikut seksyen, punca utama dan insiden terpanjang" },
  { id: "quality", n: "7", label: "Kualiti & Kadar Reject", desc: "Analisis Pareto reject dan kadar ikut kategori" },
  { id: "coverage", n: "8", label: "Kepatuhan Pengisian Borang", desc: "Hari dan shift yang borangnya tidak diisi" },
  { id: "appendix", n: "9", label: "Lampiran: Data Harian", desc: "Jadual penuh pengeluaran harian" },
  { id: "storeroom", n: "10", label: "Storeroom Balance Report", desc: "Baki carry forward penuh ikut SKU, dengan DO number dan stok ditahan" },
]

/**
 * Invisible probe that reports the real page number a section landed on.
 *
 * Sections can overflow onto a second page, so the table of contents cannot simply count
 * sections. The document is rendered twice: the first pass collects these page numbers, the
 * second pass prints them.
 */
function PageMarker({ id, onResolve }: { id: string; onResolve?: (id: string, page: number) => void }) {
  if (!onResolve) return null
  return (
    <Text
      style={{ position: "absolute", top: 0, left: 0, fontSize: 1, color: "#ffffff" }}
      render={({ pageNumber }) => {
        onResolve(id, pageNumber)
        return ""
      }}
    />
  )
}

export function AnalyticsReportDocument({
  data,
  summary,
  storeroom,
  logo,
  preparedBy,
  generatedAt,
  pageMap = {},
  onResolvePage,
}: {
  data: AnalyticsPayload
  summary: ExecutiveSummary
  storeroom: StoreroomReport
  logo: string
  preparedBy: string
  generatedAt: string
  pageMap?: Record<string, number>
  onResolvePage?: (id: string, page: number) => void
}) {
  const rangeLabel = `${dmy(data.range.from)} – ${dmy(data.range.to)}`
  const { kpi, bySku, byDay, byShift, byLine, extremes, problems, rates, coverage, trends, dataQuality } = data

  const activeSkus = bySku.filter(s2 => s2.boxes > 0)
  const skuSeries = activeSkus.map(s2 => ({ key: s2.key, label: s2.label, color: SKU_COLORS[s2.key] }))
  const skuChartData = byDay.map(d => ({ label: dm(d.date), values: d.bySku }))
  const shiftChartData = byDay.map(d => ({ label: dm(d.date), values: { AM: d.byShift.AM || 0, PM: d.byShift.PM || 0 } }))

  const page = (children: React.ReactNode, key: string) => (
    <Page key={key} size="A4" style={s.page}>
      <RunningHeader logo={logo} range={rangeLabel} />
      <PageMarker id={key} onResolve={onResolvePage} />
      {children}
      <RunningFooter generatedAt={generatedAt} />
    </Page>
  )

  return (
    <Document
      title={`Laporan Analitik Pengeluaran ${rangeLabel}`}
      author="BubblesO2 AIO System"
      subject="Laporan Analitik Pengeluaran"
      creator="BubblesO2 AIO System"
    >
      {/* ------------------------------------------------------------------ Cover */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBand}>
          <Image src={logo} style={s.coverLogo} />
          <Text style={s.coverEyebrow}>BubblesO2 · Forms Analytics</Text>
          <Text style={s.coverTitle}>Laporan Analitik{"\n"}Pengeluaran</Text>
          <View style={s.coverRule} />
        </View>

        <View style={s.coverBody}>
          <Text style={s.coverPeriodLabel}>Tempoh Laporan</Text>
          <Text style={s.coverPeriod}>{rangeLabel}</Text>

          <Text style={s.coverHeadline}>{summary.headline}</Text>

          <View style={s.coverStats}>
            <View style={s.coverStat}>
              <Text style={s.coverStatValue}>{nf(kpi.totalBoxes)}</Text>
              <Text style={s.coverStatLabel}>Kotak Dihasilkan</Text>
            </View>
            <View style={s.coverStat}>
              <Text style={s.coverStatValue}>{kpi.rejectRate}%</Text>
              <Text style={s.coverStatLabel}>Kadar Reject</Text>
            </View>
            <View style={s.coverStat}>
              <Text style={s.coverStatValue}>{nf(kpi.totalDowntime)}m</Text>
              <Text style={s.coverStatLabel}>Jumlah Downtime</Text>
            </View>
            <View style={s.coverStat}>
              <Text style={s.coverStatValue}>{kpi.compliancePct}%</Text>
              <Text style={s.coverStatLabel}>Compliance Borang</Text>
            </View>
          </View>

          <View style={s.coverMetaBox}>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Disediakan Oleh</Text>
              <Text style={s.coverMetaVal}>{preparedBy}</Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Tarikh Dijana</Text>
              <Text style={s.coverMetaVal}>{generatedAt}</Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Sumber Data</Text>
              <Text style={s.coverMetaVal}>
                Daily Production Report yang telah diluluskan ({kpi.reportsSubmitted} daripada {kpi.reportsExpected} slot dijangka)
              </Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Ringkasan</Text>
              <Text style={s.coverMetaVal}>
                {summary.source === "ai" ? "Dijana dengan bantuan AI dan disemak terhadap data sebenar" : "Dijana secara automatik daripada data (mod tanpa AI)"}
              </Text>
            </View>
          </View>

          <Text style={s.note}>
            Dokumen ini dijana secara automatik daripada sistem BubblesO2 AIO. Semua angka diambil terus daripada
            borang Daily Production Report yang telah diluluskan dalam tempoh di atas.
          </Text>
        </View>
      </Page>

      {/* ------------------------------------------------------------------ TOC */}
      {page(
        <View>
          <SectionHeading title="Kandungan" />
          {TOC.map(t => (
            <View key={t.n} wrap={false}>
              <View style={s.tocRow}>
                <Text style={s.tocNum}>{t.n}</Text>
                <Text style={s.tocLabel}>{t.label}</Text>
                <View style={s.tocDots} />
                <Text style={s.tocPage}>{pageMap[t.id] ?? "—"}</Text>
              </View>
              <Text style={s.tocDesc}>{t.desc}</Text>
            </View>
          ))}

          <Text style={s.h2}>Nota Metodologi</Text>
          <Bullets
            items={[
              "Hanya borang berstatus APPROVED dikira dalam semua metrik pengeluaran, reject dan downtime.",
              "Jadual dijangka: Isnin hingga Jumaat 2 shift x 2 line, Sabtu 1 shift x 2 line, Ahad hari rehat.",
              "Jumlah kotak diambil daripada medan Total Produced setiap SKU; pecahan batch digunakan hanya untuk semakan.",
              "Baris downtime bernilai sifar minit diabaikan kerana ia baris lalai borang, bukan insiden sebenar.",
              "Reject dikira sebagai jumlah Before dan After bagi setiap item.",
            ]}
          />
        </View>,
        "toc"
      )}

      {/* ------------------------------------------------------------------ 1. Executive summary */}
      {page(
        <View>
          <SectionHeading title="1. Executive Summary" />
          <Text style={s.p}>{summary.headline}</Text>

          <Text style={s.h2}>Gambaran Keseluruhan</Text>
          <Bullets items={summary.overview} />

          <Text style={s.h2}>Penemuan Utama</Text>
          <Bullets items={summary.findings} />

          <Text style={s.h2}>Risiko & Isu</Text>
          <Bullets items={summary.risks} />

          <Text style={s.h2}>Cadangan Tindakan</Text>
          <Bullets items={summary.recommendations} />

          <Text style={s.note}>
            {summary.source === "ai"
              ? "Ringkasan ini dijana dengan bantuan AI berdasarkan data yang dilampirkan dalam laporan ini. Semua nilai berangka datang terus daripada pangkalan data."
              : "Ringkasan ini dijana secara berperaturan terus daripada data kerana perkhidmatan AI tidak tersedia semasa laporan dijana."}
          </Text>
        </View>,
        "exec"
      )}

      {/* ------------------------------------------------------------------ 2. Overall */}
      {page(
        <View>
          <SectionHeading title="2. Prestasi Keseluruhan" />

          <View style={s.kpiGrid}>
            <Kpi label="Jumlah Pengeluaran" value={nf(kpi.totalBoxes)} sub={`${nf(kpi.totalPcs)} botol`} />
            <Kpi label="Purata Sehari Bekerja" value={nf(kpi.avgBoxesPerWorkingDay)} sub={`${data.range.workingDays} hari bekerja`} />
            <Kpi label="Jumlah Reject" value={nf(kpi.totalRejects)} sub="unit defektif" />
            <Kpi label="Kadar Reject" value={`${kpi.rejectRate}%`} sub="reject / jumlah input" />
            <Kpi label="Jumlah Downtime" value={`${nf(kpi.totalDowntime)}m`} sub={`${kpi.downtimeIncidents} insiden`} />
            <Kpi label="Compliance Borang" value={`${kpi.compliancePct}%`} sub={`${kpi.reportsSubmitted} / ${kpi.reportsExpected} slot`} />
          </View>

          <Text style={s.h2}>Trend Pengeluaran Harian (Kotak)</Text>
          <View style={s.chartWrap}>
            <TrendChart data={trends.production.map(t => ({ label: dm(t.date), value: t.boxes }))} />
          </View>

          <Text style={s.h2}>Trend Terimaan Bahan (Bags / Boxes)</Text>
          <View style={s.chartWrap}>
            <TrendChart data={trends.incoming.map(t => ({ label: dm(t.date), value: t.bags }))} color="#059669" height={140} />
          </View>
          <Text style={s.note}>Jumlah terimaan bahan sepanjang tempoh: {nf(kpi.totalTransferBags)} bags/boxes.</Text>
        </View>,
        "overall"
      )}

      {/* ------------------------------------------------------------------ 3. SKU */}
      {page(
        <View>
          <SectionHeading title="3. Analisis Output Ikut SKU" />

          <Text style={s.h2}>Output Harian Bertindan Ikut SKU (Kotak)</Text>
          <View style={s.chartWrap}>
            <StackedBarChart data={skuChartData} series={skuSeries} />
          </View>
          <Legend items={skuSeries.map(x => ({ label: x.label, color: x.color }))} />

          <Text style={s.h2}>Pecahan Mengikut SKU</Text>
          <View style={s.twoCol}>
            <View style={{ width: 140, alignItems: "center", paddingTop: 6 }}>
              <DonutChart
                data={bySku.map(x => ({ label: x.label, value: x.boxes, color: SKU_COLORS[x.key] }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.table}>
                <View style={[s.tr, s.thead]}>
                  <Text style={[s.th, { width: "30%" }]}>SKU</Text>
                  <Text style={[s.th, { width: "20%" }, s.right]}>Kotak</Text>
                  <Text style={[s.th, { width: "22%" }, s.right]}>Botol</Text>
                  <Text style={[s.th, { width: "14%" }, s.right]}>Share</Text>
                  <Text style={[s.th, { width: "14%" }, s.right]}>Reject</Text>
                </View>
                {bySku.map((x, i) => (
                  <View key={x.key} style={[s.tr, i === bySku.length - 1 ? s.trLast : {}]}>
                    <Text style={[s.tdB, { width: "30%" }]}>{x.label}</Text>
                    <Text style={[s.td, { width: "20%" }, s.right]}>{nf(x.boxes)}</Text>
                    <Text style={[s.td, { width: "22%" }, s.right]}>{nf(x.pcs)}</Text>
                    <Text style={[s.td, { width: "14%" }, s.right]}>{x.share}%</Text>
                    <Text style={[s.td, { width: "14%" }, s.right]}>{nf(x.rejects)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <Text style={s.note}>
            Bilangan botol dikira daripada saiz pek setiap SKU: 800ml x 20, 800ml x 12, 425ml x 24 dan 425ml x 6.
          </Text>
        </View>,
        "sku"
      )}

      {/* ------------------------------------------------------------------ 4. Shift & line */}
      {page(
        <View>
          <SectionHeading title="4. Analisis Shift & Line" />

          <Text style={s.h2}>Output Harian: Shift AM lawan PM (Kotak)</Text>
          <View style={s.chartWrap}>
            <StackedBarChart
              data={shiftChartData}
              series={[{ key: "AM", label: "AM", color: "#6366f1" }, { key: "PM", label: "PM", color: "#f59e0b" }]}
              grouped
            />
          </View>
          <Legend items={[{ label: "Shift AM", color: "#6366f1" }, { label: "Shift PM", color: "#f59e0b" }]} />

          <Text style={s.h2}>Ringkasan Shift</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "18%" }]}>Shift</Text>
              <Text style={[s.th, { width: "17%" }, s.right]}>Kotak</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Botol</Text>
              <Text style={[s.th, { width: "17%" }, s.right]}>Reject</Text>
              <Text style={[s.th, { width: "14%" }, s.right]}>Downtime</Text>
              <Text style={[s.th, { width: "14%" }, s.right]}>Report</Text>
            </View>
            {byShift.map((x, i) => (
              <View key={x.shift} style={[s.tr, i === byShift.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "18%" }]}>{x.shift}</Text>
                <Text style={[s.td, { width: "17%" }, s.right]}>{nf(x.boxes)}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{nf(x.pcs)}</Text>
                <Text style={[s.td, { width: "17%" }, s.right]}>{nf(x.rejects)}</Text>
                <Text style={[s.td, { width: "14%" }, s.right]}>{x.downtime}m</Text>
                <Text style={[s.td, { width: "14%" }, s.right]}>{x.reports}</Text>
              </View>
            ))}
          </View>

          <Text style={s.h2}>Ringkasan Line</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "36%" }]}>Line</Text>
              <Text style={[s.th, { width: "18%" }, s.right]}>Kotak</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Botol</Text>
              <Text style={[s.th, { width: "14%" }, s.right]}>Reject</Text>
              <Text style={[s.th, { width: "12%" }, s.right]}>Report</Text>
            </View>
            {byLine.map((x, i) => (
              <View key={x.line} style={[s.tr, i === byLine.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "36%" }]}>{x.line}</Text>
                <Text style={[s.td, { width: "18%" }, s.right]}>{nf(x.boxes)}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{nf(x.pcs)}</Text>
                <Text style={[s.td, { width: "14%" }, s.right]}>{nf(x.rejects)}</Text>
                <Text style={[s.td, { width: "12%" }, s.right]}>{x.reports}</Text>
              </View>
            ))}
          </View>
        </View>,
        "shift"
      )}

      {/* ------------------------------------------------------------------ 5. Extremes */}
      {page(
        <View>
          <SectionHeading title="5. Hari Tertinggi & Terendah" />

          {extremes.bestDay ? (
            <View style={[s.callout, { borderColor: "#a7f3d0", backgroundColor: C.goodSoft }]}>
              <Text style={[s.calloutLabel, { color: C.good }]}>Hari Pengeluaran Tertinggi</Text>
              <Text style={[s.calloutTitle, { color: C.good }]}>
                {extremes.bestDay.dayName}, {dmy(extremes.bestDay.date)}
              </Text>
              <Text style={[s.calloutValue, { color: C.good }]}>{nf(extremes.bestDay.boxes)} kotak</Text>
              <Text style={[s.calloutLine, { color: C.good }]}>{nf(extremes.bestDay.pcs)} botol dihasilkan</Text>
              <Text style={[s.calloutLine, { color: C.good }]}>
                Shift AM {nf(extremes.bestDay.byShift.AM || 0)} kotak · Shift PM {nf(extremes.bestDay.byShift.PM || 0)} kotak
              </Text>
              <Text style={[s.calloutLine, { color: C.good }]}>
                {nf(extremes.bestDay.rejects)} reject · {extremes.bestDay.downtime} minit downtime
              </Text>
            </View>
          ) : (
            <Text style={s.p}>Tiada hari pengeluaran direkodkan dalam tempoh ini.</Text>
          )}

          {extremes.worstDay && (
            <View style={[s.callout, { borderColor: "#fecaca", backgroundColor: C.badSoft }]}>
              <Text style={[s.calloutLabel, { color: C.bad }]}>Hari Pengeluaran Terendah</Text>
              <Text style={[s.calloutTitle, { color: C.bad }]}>
                {extremes.worstDay.dayName}, {dmy(extremes.worstDay.date)}
              </Text>
              <Text style={[s.calloutValue, { color: C.bad }]}>{nf(extremes.worstDay.boxes)} kotak</Text>
              <Text style={[s.calloutLine, { color: C.bad }]}>{nf(extremes.worstDay.pcs)} botol dihasilkan</Text>
              <Text style={[s.calloutLine, { color: C.bad }]}>
                {extremes.worstDay.reports} daripada {extremes.worstDay.expectedReports} report diterima
              </Text>
              <Text style={[s.calloutLine, { color: C.bad }]}>
                {nf(extremes.worstDay.rejects)} reject · {extremes.worstDay.downtime} minit downtime
              </Text>
            </View>
          )}

          <Text style={s.h2}>Kedudukan Hari Mengikut Output</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "28%" }]}>Tarikh</Text>
              <Text style={[s.th, { width: "16%" }]}>Hari</Text>
              <Text style={[s.th, { width: "18%" }, s.right]}>Kotak</Text>
              <Text style={[s.th, { width: "19%" }, s.right]}>Reject</Text>
              <Text style={[s.th, { width: "19%" }, s.right]}>Downtime</Text>
            </View>
            {[...byDay]
              .filter(d => d.isWorkingDay && d.reports > 0)
              .sort((a, b) => b.boxes - a.boxes)
              .map((d, i, arr) => (
                <View key={d.date} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                  <Text style={[s.tdB, { width: "28%" }]}>{dmy(d.date)}</Text>
                  <Text style={[s.td, { width: "16%" }]}>{d.dayName}</Text>
                  <Text style={[s.td, { width: "18%" }, s.right]}>{nf(d.boxes)}</Text>
                  <Text style={[s.td, { width: "19%" }, s.right]}>{nf(d.rejects)}</Text>
                  <Text style={[s.td, { width: "19%" }, s.right]}>{d.downtime}m</Text>
                </View>
              ))}
          </View>
        </View>,
        "extremes"
      )}

      {/* ------------------------------------------------------------------ 6. Problems */}
      {page(
        <View>
          <SectionHeading title="6. Masalah & Downtime" />

          <Text style={s.p}>
            Sepanjang tempoh ini terdapat {kpi.downtimeIncidents} insiden downtime dengan jumlah {nf(kpi.totalDowntime)} minit
            terhenti, merentasi {problems.downtimeBySection.length} seksyen.
          </Text>

          <Text style={s.h2}>Downtime Mengikut Seksyen (Minit)</Text>
          {problems.downtimeBySection.length > 0 ? (
            <View style={s.chartWrap}>
              <HorizontalBars
                data={problems.downtimeBySection.map(x => ({ label: x.section, value: x.minutes }))}
                valueSuffix="m"
              />
            </View>
          ) : (
            <Text style={s.p}>Tiada downtime direkodkan.</Text>
          )}

          {problems.longestIncident && (
            <View style={[s.callout, { borderColor: "#fed7aa", backgroundColor: C.warnSoft }]}>
              <Text style={[s.calloutLabel, { color: C.warn }]}>Insiden Tunggal Terpanjang</Text>
              <Text style={[s.calloutTitle, { color: C.warn }]}>
                {problems.longestIncident.minutes} minit — {problems.longestIncident.section}
              </Text>
              <Text style={[s.calloutLine, { color: C.warn }]}>
                {dmy(problems.longestIncident.date)} · Shift {problems.longestIncident.shift}
              </Text>
              <Text style={[s.calloutLine, { color: C.warn }]}>Sebab: {problems.longestIncident.reason}</Text>
            </View>
          )}

          <Text style={s.h2}>Punca Downtime Utama</Text>
          {problems.topReasons.length > 0 ? (
            <View style={s.table}>
              <View style={[s.tr, s.thead]}>
                <Text style={[s.th, { width: "62%" }]}>Sebab</Text>
                <Text style={[s.th, { width: "20%" }, s.right]}>Jumlah</Text>
                <Text style={[s.th, { width: "18%" }, s.right]}>Kekerapan</Text>
              </View>
              {problems.topReasons.map((r, i, arr) => (
                <View key={r.reason} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                  <Text style={[s.td, { width: "62%" }]}>{r.reason}</Text>
                  <Text style={[s.tdB, { width: "20%" }, s.right]}>{r.minutes}m</Text>
                  <Text style={[s.td, { width: "18%" }, s.right]}>{r.count}x</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.p}>Tiada sebab downtime direkodkan.</Text>
          )}

          <Text style={s.h2}>Butiran Seksyen</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "40%" }]}>Seksyen</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Jumlah</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Insiden</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Terpanjang</Text>
            </View>
            {problems.downtimeBySection.map((x, i, arr) => (
              <View key={x.section} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "40%" }]}>{x.section}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{x.minutes}m</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{x.incidents}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{x.longest}m</Text>
              </View>
            ))}
          </View>
        </View>,
        "problems"
      )}

      {/* ------------------------------------------------------------------ 7. Quality */}
      {page(
        <View>
          <SectionHeading title="7. Kualiti & Kadar Reject" />

          <Text style={s.p}>
            Jumlah reject {nf(kpi.totalRejects)} unit pada kadar keseluruhan {kpi.rejectRate}% berbanding jumlah input bahan.
          </Text>

          <Text style={s.h2}>Analisis Pareto Reject</Text>
          {problems.paretoRejects.length > 0 ? (
            <View style={s.chartWrap}>
              <ParetoChart data={problems.paretoRejects} colors={REJECT_COLORS} />
            </View>
          ) : (
            <Text style={s.p}>Tiada reject direkodkan.</Text>
          )}

          <Text style={s.h2}>Kadar Reject Mengikut Kategori Bahan</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "22%" }]}>Kategori</Text>
              <Text style={[s.th, { width: "24%" }, s.right]}>Penggunaan</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Reject</Text>
              <Text style={[s.th, { width: "16%" }, s.right]}>Kadar</Text>
              <Text style={[s.th, { width: "18%" }]}>Status</Text>
            </View>
            {Object.entries(rates.categoryStats).map(([cat, x], i, arr) => (
              <View key={cat} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "22%" }]}>{cat}</Text>
                <Text style={[s.td, { width: "24%" }, s.right]}>{nf(x.usage)}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{nf(x.rejects)}</Text>
                <Text style={[s.tdB, { width: "16%" }, s.right]}>{x.comparable ? `${x.rate}%` : "N/A"}</Text>
                <Text style={[s.td, { width: "18%", fontSize: 6.5 }]}>
                  {x.comparable ? (x.rate > 5 ? "Melebihi 5%" : "Dalam had") : "Unit tak sepadan"}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.note}>
            Kadar LABEL ditandakan N/A kerana penggunaan direkodkan dalam unit roll manakala reject direkodkan dalam
            keping label. Kedua-dua nilai tidak boleh dibandingkan secara terus sehingga unit diselaraskan.
          </Text>

          <Text style={s.h2}>Reject Mengikut SKU Kotak</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "34%" }]}>SKU</Text>
              <Text style={[s.th, { width: "22%" }, s.right]}>Kotak</Text>
              <Text style={[s.th, { width: "22%" }, s.right]}>Reject</Text>
              <Text style={[s.th, { width: "22%" }, s.right]}>Kadar</Text>
            </View>
            {rates.skuRejectRates.map((x, i, arr) => (
              <View key={x.key} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "34%" }]}>{x.label}</Text>
                <Text style={[s.td, { width: "22%" }, s.right]}>{nf(x.boxes)}</Text>
                <Text style={[s.td, { width: "22%" }, s.right]}>{nf(x.rejects)}</Text>
                <Text style={[s.td, { width: "22%" }, s.right]}>{x.rate}%</Text>
              </View>
            ))}
          </View>
        </View>,
        "quality"
      )}

      {/* ------------------------------------------------------------------ 8. Coverage */}
      {page(
        <View>
          <SectionHeading title="8. Kepatuhan Pengisian Borang" />

          <Text style={s.p}>
            Daripada {coverage.expectedSlots} slot borang yang dijangka, {coverage.submittedSlots} telah diisi.
            Kadar kepatuhan {coverage.compliancePct}%.
          </Text>

          <Text style={s.h2}>Kalendar Kepatuhan</Text>
          <View style={s.chartWrap}>
            <CoverageStrip data={coverage.calendar} />
          </View>
          <Legend
            items={[
              { label: "Lengkap", color: "#a7f3d0" },
              { label: "Separa", color: "#fde68a" },
              { label: "Tiada", color: "#fecaca" },
              { label: "Bukan hari bekerja", color: "#f1f5f9" },
            ]}
          />

          <Text style={s.h2}>Borang Tidak Diisi ({coverage.missing.length})</Text>
          {coverage.missing.length > 0 ? (
            <View style={s.table}>
              <View style={[s.tr, s.thead]}>
                <Text style={[s.th, { width: "28%" }]}>Tarikh</Text>
                <Text style={[s.th, { width: "22%" }]}>Hari</Text>
                <Text style={[s.th, { width: "18%" }]}>Shift</Text>
                <Text style={[s.th, { width: "32%" }]}>Line</Text>
              </View>
              {coverage.missing.map((m, i, arr) => (
                <View key={`${m.date}${m.shift}${m.line}`} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                  <Text style={[s.tdB, { width: "28%" }]}>{dmy(m.date)}</Text>
                  <Text style={[s.td, { width: "22%" }]}>{m.dayName}</Text>
                  <Text style={[s.td, { width: "18%" }]}>{m.shift}</Text>
                  <Text style={[s.td, { width: "32%" }]}>{m.line}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.p}>Semua slot borang yang dijangka telah diisi.</Text>
          )}

          <Text style={s.h2}>Borang Belum Diluluskan ({coverage.notApproved.length})</Text>
          {coverage.notApproved.length > 0 ? (
            <View style={s.table}>
              <View style={[s.tr, s.thead]}>
                <Text style={[s.th, { width: "28%" }]}>Tarikh</Text>
                <Text style={[s.th, { width: "18%" }]}>Shift</Text>
                <Text style={[s.th, { width: "34%" }]}>Line</Text>
                <Text style={[s.th, { width: "20%" }]}>Status</Text>
              </View>
              {coverage.notApproved.map((n, i, arr) => (
                <View key={n.id} style={[s.tr, i === arr.length - 1 ? s.trLast : {}]}>
                  <Text style={[s.tdB, { width: "28%" }]}>{dmy(n.date)}</Text>
                  <Text style={[s.td, { width: "18%" }]}>{n.shift}</Text>
                  <Text style={[s.td, { width: "34%" }]}>{n.line}</Text>
                  <Text style={[s.td, { width: "20%" }]}>{n.status}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.p}>Semua borang dalam tempoh ini telah diluluskan.</Text>
          )}
          <Text style={s.note}>
            Borang yang belum diluluskan tidak dikira dalam metrik pengeluaran, reject dan downtime dalam laporan ini.
          </Text>
        </View>,
        "coverage"
      )}

      {/* ------------------------------------------------------------------ 9. Appendix */}
      {page(
        <View>
          <SectionHeading title="9. Lampiran: Data Harian" />

          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "15%" }]}>Tarikh</Text>
              <Text style={[s.th, { width: "12%" }]}>Hari</Text>
              <Text style={[s.th, { width: "13%" }, s.right]}>Kotak</Text>
              <Text style={[s.th, { width: "13%" }, s.right]}>AM</Text>
              <Text style={[s.th, { width: "13%" }, s.right]}>PM</Text>
              <Text style={[s.th, { width: "14%" }, s.right]}>Reject</Text>
              <Text style={[s.th, { width: "10%" }, s.right]}>Down</Text>
              <Text style={[s.th, { width: "10%" }, s.right]}>Report</Text>
            </View>
            {byDay.map((d, i) => (
              <View key={d.date} style={[s.tr, i === byDay.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "15%" }]}>{dmy(d.date)}</Text>
                <Text style={[s.td, { width: "12%" }]}>{d.dayName}</Text>
                <Text style={[s.td, { width: "13%" }, s.right]}>{nf(d.boxes)}</Text>
                <Text style={[s.td, { width: "13%" }, s.right]}>{nf(d.byShift.AM || 0)}</Text>
                <Text style={[s.td, { width: "13%" }, s.right]}>{nf(d.byShift.PM || 0)}</Text>
                <Text style={[s.td, { width: "14%" }, s.right]}>{nf(d.rejects)}</Text>
                <Text style={[s.td, { width: "10%" }, s.right]}>{d.downtime}m</Text>
                <Text style={[s.td, { width: "10%" }, s.right]}>
                  {d.isWorkingDay ? `${d.reports}/${d.expectedReports}` : "-"}
                </Text>
              </View>
            ))}
          </View>

          {(dataQuality.batchMismatch.length > 0 || dataQuality.duplicateSlots.length > 0) && (
            <View>
              <Text style={s.h2}>Amaran Kualiti Data</Text>
              {dataQuality.batchMismatch.length > 0 && (
                <Text style={s.p}>
                  {dataQuality.batchMismatch.length} rekod di mana jumlah kotak tidak sepadan dengan pecahan batch.
                </Text>
              )}
              {dataQuality.duplicateSlots.length > 0 && (
                <Text style={s.p}>
                  {dataQuality.duplicateSlots.length} slot mempunyai lebih daripada satu borang, berisiko dikira dua kali.
                </Text>
              )}
            </View>
          )}

        </View>,
        "appendix"
      )}

      {/* ------------------------------------------------------------------ 10. Storeroom */}
      {page(
        <View>
          <SectionHeading title="10. Storeroom Balance Report" />

          <Text style={s.p}>
            Baki carry forward setakat {dmy(storeroom.asOf)}. {storeroom.totals.batches} batch tersedia merentasi
            {" "}{storeroom.groups.filter(g => g.batches > 0).length} SKU, bersamaan {nf(storeroom.totals.pcs)} keping.
            {storeroom.totals.heldBatches > 0
              ? ` ${storeroom.totals.heldBatches} batch ditahan (HOLD) disenaraikan berasingan dan tidak dikira dalam baki tersedia.`
              : ""}
          </Text>

          <Text style={s.h2}>10.1 Ringkasan Ikut SKU</Text>
          <View style={s.table}>
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, { width: "30%" }]}>SKU</Text>
              <Text style={[s.th, { width: "12%" }, s.right]}>Batch</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Baki Tersedia</Text>
              <Text style={[s.th, { width: "20%" }, s.right]}>Setara Pcs</Text>
              <Text style={[s.th, { width: "18%" }, s.right]}>Ditahan</Text>
            </View>
            {storeroom.groups.map((g, i) => (
              <View key={g.sku} style={[s.tr, i === storeroom.groups.length - 1 ? s.trLast : {}]}>
                <Text style={[s.tdB, { width: "30%" }]}>{g.sku}</Text>
                <Text style={[s.td, { width: "12%" }, s.right]}>{g.batches}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{`${nf(g.balance)} ${g.unit}`}</Text>
                <Text style={[s.td, { width: "20%" }, s.right]}>{nf(g.pcs)}</Text>
                <Text style={[s.td, { width: "18%" }, s.right]}>
                  {g.heldBalance > 0 ? `${nf(g.heldBalance)} ${g.unit}` : "-"}
                </Text>
              </View>
            ))}
            <View style={[s.tr, s.trLast, { backgroundColor: "#f8fafc" }]}>
              <Text style={[s.tdB, { width: "30%" }]}>JUMLAH</Text>
              <Text style={[s.tdB, { width: "12%" }, s.right]}>{storeroom.totals.batches}</Text>
              <Text style={[s.td, { width: "20%" }, s.right]}>—</Text>
              <Text style={[s.tdB, { width: "20%" }, s.right]}>{nf(storeroom.totals.pcs)}</Text>
              <Text style={[s.td, { width: "18%" }, s.right]}>—</Text>
            </View>
          </View>
          <Text style={s.note}>
            Unit berbeza ikut bahan: bottle dan cap dalam bag, box dalam box, label dalam roll. Setara pcs dikira
            daripada baki didarab multiplier setiap batch.
          </Text>

          <Text style={s.h2}>10.2 Detail Baki Ikut Batch</Text>
          {storeroom.rows.length > 0 ? (
            <View style={s.table}>
              <View style={[s.tr, s.thead]} fixed>
                <Text style={[s.th, { width: "26%" }]}>DO No</Text>
                <Text style={[s.th, { width: "22%" }]}>SKU</Text>
                <Text style={[s.th, { width: "18%" }]}>Batch No</Text>
                <Text style={[s.th, { width: "17%" }, s.right]}>Balance</Text>
                <Text style={[s.th, { width: "17%" }, s.right]}>Setara Pcs</Text>
              </View>
              {storeroom.rows.map((r, i) => (
                <View key={`${r.sku}|${r.batchNo}|${i}`} style={[s.tr, i === storeroom.rows.length - 1 ? s.trLast : {}]} wrap={false}>
                  <Text style={[s.td, { width: "26%", fontSize: 7 }]}>{shortDo(r.doNumber)}</Text>
                  <Text style={[s.tdB, { width: "22%" }]}>{r.sku}</Text>
                  <Text style={[s.td, { width: "18%" }]}>{r.batchNo}</Text>
                  <Text style={[s.td, { width: "17%" }, s.right]}>{`${nf(r.balance)} ${r.unit}`}</Text>
                  <Text style={[s.td, { width: "17%" }, s.right]}>{nf(r.pcs)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.p}>Tiada baki storeroom setakat tarikh ini.</Text>
          )}
          <Text style={s.note}>
            Satu batch boleh menerima bekalan daripada beberapa DO. Dua DO pertama dipaparkan di sini dengan kiraan
            selebihnya; senarai penuh setiap DO ada dalam fail Excel "Export Balance".
          </Text>

          <Text style={s.h2}>10.3 Stok Ditahan (HOLD)</Text>
          {storeroom.holds.length > 0 ? (
            <View style={s.table}>
              <View style={[s.tr, s.thead]}>
                <Text style={[s.th, { width: "30%" }]}>SKU</Text>
                <Text style={[s.th, { width: "28%" }]}>Batch No</Text>
                <Text style={[s.th, { width: "21%" }, s.right]}>Qty Ditahan</Text>
                <Text style={[s.th, { width: "21%" }, s.right]}>Setara Pcs</Text>
              </View>
              {storeroom.holds.map((r, i) => (
                <View
                  key={`hold|${r.sku}|${r.batchNo}|${i}`}
                  style={[s.tr, i === storeroom.holds.length - 1 ? s.trLast : {}, { backgroundColor: C.warnSoft }]}
                  wrap={false}
                >
                  <Text style={[s.tdB, { width: "30%" }]}>{r.sku}</Text>
                  <Text style={[s.td, { width: "28%" }]}>{r.batchNo}</Text>
                  <Text style={[s.td, { width: "21%" }, s.right]}>{`${nf(r.balance)} ${r.unit}`}</Text>
                  <Text style={[s.td, { width: "21%" }, s.right]}>{nf(r.pcs)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.p}>Tiada stok ditahan setakat tarikh ini.</Text>
          )}
          <Text style={s.note}>
            Stok ditahan menunggu keputusan kuarantin dan tidak boleh digunakan dalam pengeluaran. Ia tidak dikira
            dalam baki tersedia di 10.1 dan 10.2.
          </Text>

          {storeroom.warnings.length > 0 && (
            <View>
              <Text style={s.h2}>Amaran Data</Text>
              <Bullets items={storeroom.warnings} />
            </View>
          )}

          <Text style={s.note}>
            Tamat laporan. Dijana oleh BubblesO2 AIO System pada {generatedAt} oleh {preparedBy}.
          </Text>
        </View>,
        "storeroom"
      )}
    </Document>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  )
}
