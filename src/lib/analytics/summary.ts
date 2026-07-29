import type { AnalyticsPayload, ExecutiveSummary } from "./types"

const fmt = (n: number) => n.toLocaleString("en-MY")
const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/**
 * Deterministic executive summary built purely from the numbers.
 *
 * Used as the fallback whenever Gemini is unavailable (no API key, quota, 503), and also as the
 * factual brief that is handed to the model so it never has to invent figures.
 */
export function buildRuleBasedSummary(d: AnalyticsPayload): ExecutiveSummary {
  const { kpi, extremes, problems, coverage, bySku } = d

  const topSku = bySku[0]
  const topSection = problems.downtimeBySection[0]
  const topReject = problems.paretoRejects[0]

  const overview: string[] = [
    `Sepanjang ${dmy(d.range.from)} hingga ${dmy(d.range.to)} (${d.range.workingDays} hari bekerja), jumlah pengeluaran ialah ${fmt(kpi.totalBoxes)} kotak bersamaan ${fmt(kpi.totalPcs)} botol.`,
    `Purata pengeluaran ${fmt(kpi.avgBoxesPerWorkingDay)} kotak sehari bekerja.`,
    `Jumlah reject ${fmt(kpi.totalRejects)} unit pada kadar keseluruhan ${kpi.rejectRate}%.`,
    `Jumlah downtime ${fmt(kpi.totalDowntime)} minit daripada ${kpi.downtimeIncidents} insiden.`,
  ]

  const findings: string[] = []
  if (topSku && topSku.boxes > 0) {
    findings.push(`SKU ${topSku.label} mendominasi pengeluaran dengan ${fmt(topSku.boxes)} kotak (${topSku.share}% daripada jumlah).`)
  }
  if (extremes.bestDay) {
    findings.push(`Hari pengeluaran tertinggi ialah ${extremes.bestDay.dayName} ${dmy(extremes.bestDay.date)} dengan ${fmt(extremes.bestDay.boxes)} kotak.`)
  }
  if (extremes.worstDay) {
    findings.push(`Hari pengeluaran terendah ialah ${extremes.worstDay.dayName} ${dmy(extremes.worstDay.date)} dengan ${fmt(extremes.worstDay.boxes)} kotak sahaja.`)
  }
  if (extremes.bestShiftLabel && extremes.worstShiftLabel && extremes.bestShiftLabel !== extremes.worstShiftLabel) {
    const best = d.byShift.find(s => s.shift === extremes.bestShiftLabel)
    const worst = d.byShift.find(s => s.shift === extremes.worstShiftLabel)
    if (best && worst) {
      findings.push(`Shift ${best.shift} menghasilkan ${fmt(best.boxes)} kotak berbanding shift ${worst.shift} ${fmt(worst.boxes)} kotak.`)
    }
  }
  if (topReject) {
    findings.push(`Penyumbang reject terbesar ialah ${topReject.name} dengan ${fmt(topReject.value)} unit (${topReject.cumulative}% kumulatif).`)
  }

  const risks: string[] = []
  if (topSection) {
    risks.push(`${topSection.section} menyumbang downtime tertinggi iaitu ${fmt(topSection.minutes)} minit daripada ${topSection.incidents} insiden.`)
  }
  if (problems.longestIncident) {
    risks.push(`Insiden tunggal terpanjang ${problems.longestIncident.minutes} minit di ${problems.longestIncident.section} pada ${dmy(problems.longestIncident.date)} shift ${problems.longestIncident.shift}.`)
  }
  if (coverage.missing.length > 0) {
    const list = coverage.missing.slice(0, 5).map(m => `${dmy(m.date)} ${m.shift} ${m.line}`).join("; ")
    risks.push(`${coverage.missing.length} slot borang tidak diisi: ${list}${coverage.missing.length > 5 ? " dan lain-lain" : ""}.`)
  }
  if (coverage.notApproved.length > 0) {
    risks.push(`${coverage.notApproved.length} borang masih belum diluluskan dan tidak dikira dalam metrik di atas.`)
  }
  const highRate = Object.entries(d.rates.categoryStats).filter(([, s]) => s.comparable && s.rate > 5)
  if (highRate.length > 0) {
    risks.push(`Kadar reject melebihi 5% bagi ${highRate.map(([c, s]) => `${c} (${s.rate}%)`).join(", ")}.`)
  }

  const recommendations: string[] = []
  if (topSection) {
    recommendations.push(`Siasat punca berulang di ${topSection.section} — ia sahaja menyumbang ${Math.round((topSection.minutes / Math.max(kpi.totalDowntime, 1)) * 100)}% daripada jumlah downtime.`)
  }
  if (coverage.missing.length > 0) {
    recommendations.push(`Pastikan setiap shift melengkapkan borang. Compliance semasa ${kpi.compliancePct}% (${kpi.reportsSubmitted}/${kpi.reportsExpected} slot).`)
  }
  if (coverage.notApproved.length > 0) {
    recommendations.push(`Luluskan borang yang tertunggak supaya angka analitik mencerminkan pengeluaran sebenar.`)
  }
  if (topReject) {
    recommendations.push(`Fokuskan tindakan pembaikan pada ${topReject.name} kerana ia mewakili bahagian terbesar reject.`)
  }
  if (recommendations.length === 0) {
    recommendations.push("Tiada isu ketara dikesan dalam tempoh ini. Kekalkan amalan semasa.")
  }

  const headline = extremes.bestDay
    ? `${fmt(kpi.totalBoxes)} kotak dihasilkan dengan kadar reject ${kpi.rejectRate}% dan compliance borang ${kpi.compliancePct}%`
    : `Tiada pengeluaran direkodkan bagi tempoh ${dmy(d.range.from)} – ${dmy(d.range.to)}`

  return { headline, overview, findings, risks, recommendations, source: "rule-based" }
}

/** Compact factual brief handed to the model. Keeps the prompt small and the figures exact. */
export function buildAnalyticsBrief(d: AnalyticsPayload) {
  return {
    tempoh: { dari: d.range.from, hingga: d.range.to, hariBekerja: d.range.workingDays },
    jumlah: {
      kotak: d.kpi.totalBoxes,
      botol: d.kpi.totalPcs,
      reject: d.kpi.totalRejects,
      kadarRejectPeratus: d.kpi.rejectRate,
      downtimeMinit: d.kpi.totalDowntime,
      insidenDowntime: d.kpi.downtimeIncidents,
      // This is form-submission compliance, not a quality or yield figure.
      peratusBorangDiisi: d.kpi.compliancePct,
      purataKotakSehari: d.kpi.avgBoxesPerWorkingDay,
    },
    ikutSku: d.bySku.map(s => ({ sku: s.label, kotak: s.boxes, botol: s.pcs, peratusShare: s.share, reject: s.rejects })),
    ikutShift: d.byShift.map(s => ({ shift: s.shift, kotak: s.boxes, reject: s.rejects, downtimeMinit: s.downtime, bilanganReport: s.reports })),
    ikutLine: d.byLine.map(l => ({ line: l.line, kotak: l.boxes, reject: l.rejects })),
    harian: d.byDay.map(x => ({ tarikh: x.date, hari: x.dayName, hariBekerja: x.isWorkingDay, kotak: x.boxes, reject: x.rejects, downtimeMinit: x.downtime, reportDiterima: x.reports, reportDijangka: x.expectedReports })),
    hariTerbaik: d.extremes.bestDay ? { tarikh: d.extremes.bestDay.date, hari: d.extremes.bestDay.dayName, kotak: d.extremes.bestDay.boxes } : null,
    hariTerendah: d.extremes.worstDay ? { tarikh: d.extremes.worstDay.date, hari: d.extremes.worstDay.dayName, kotak: d.extremes.worstDay.boxes } : null,
    downtimeIkutSeksyen: d.problems.downtimeBySection.map(s => ({ seksyen: s.section, minit: s.minutes, insiden: s.incidents, sebab: s.reasons.slice(0, 3) })),
    rejectTerbesar: d.problems.paretoRejects.slice(0, 6),
    kadarIkutKategori: Object.entries(d.rates.categoryStats).map(([kategori, s]) => ({
      kategori,
      guna: s.usage,
      reject: s.rejects,
      // Only quote kadarPeratus when bolehDibanding is true. Where it is false the usage and
      // reject figures are in different units, so the percentage is meaningless.
      kadarPeratus: s.comparable ? s.rate : null,
      bolehDibanding: s.comparable,
      nota: s.comparable ? null : `Unit tidak sepadan (${s.unit}) — kadar tidak sah untuk dilaporkan`,
    })),
    borangTidakDiisi: d.coverage.missing,
    borangBelumDiluluskan: d.coverage.notApproved.map(n => ({ tarikh: n.date, shift: n.shift, line: n.line, status: n.status })),
  }
}
