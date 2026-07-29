/**
 * READ-ONLY audit of the daily-report carry-forward chain.
 *
 * Reproduces the exact replay used by getActiveInventory() (src/app/actions/dailyReport.ts)
 * and reports where it disagrees with what the reports actually print.
 *
 * Nothing is written. Only findMany() is used.
 *
 *   npx tsx scripts/audit_carry_forward.ts
 *   npx tsx scripts/audit_carry_forward.ts > scripts/output_audit.txt
 */
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env', override: true })

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
})

const toMalaysiaDateStr = (d: Date) =>
  new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0]

const getTimePoint = (d: Date, s: string | null) => {
  let score = new Date(toMalaysiaDateStr(d)).getTime()
  if (s === 'AM') score += 1
  else if (s === 'PM') score += 2
  else score += 1
  return score
}

const tpLabel = (tp: number) => {
  const rem = tp % 1000
  const shift = rem === 2 ? 'PM' : 'AM'
  return `${new Date(tp - (rem % 10)).toISOString().slice(0, 10)} ${shift}`
}

const show = (s: string) => (s === s.trim() ? s : `${s}·`.replace(/ ·$/, '␣') + '')
const raw = (s: string) => `[${s}]${s === s.trim() ? '' : ` (len ${s.length}, NOT trimmed)`}`

const head = (n: number, title: string) => {
  console.log('')
  console.log('='.repeat(78))
  console.log(`${n}. ${title}`)
  console.log('='.repeat(78))
}

async function main() {
  const [items, logs, reports] = await Promise.all([
    prisma.transferInItem.findMany({ include: { transferIn: true } }),
    prisma.inventoryLog.findMany({ include: { report: true } }),
    prisma.dailyReport.findMany({ orderBy: { date: 'asc' } }),
  ])

  console.log(`Audit run ${new Date().toISOString()}`)
  console.log(`TransferInItem: ${items.length}   InventoryLog: ${logs.length}   DailyReport: ${reports.length}`)

  // ---------------------------------------------------------------- 1
  head(1, 'BATCH NO BERMASALAH (whitespace / kembar selepas trim)')
  const byTrim = new Map<string, Map<string, { items: number; logs: number; reports: Set<string> }>>()
  const bump = (batchNo: string, kind: 'items' | 'logs', reportId?: string) => {
    const t = batchNo.trim()
    if (!byTrim.has(t)) byTrim.set(t, new Map())
    const inner = byTrim.get(t)!
    if (!inner.has(batchNo)) inner.set(batchNo, { items: 0, logs: 0, reports: new Set() })
    const rec = inner.get(batchNo)!
    rec[kind]++
    if (reportId) rec.reports.add(reportId.slice(0, 8))
  }
  items.forEach(i => bump(i.batchNo, 'items'))
  logs.forEach(l => bump(l.batchNo, 'logs', l.reportId))

  let problem1 = 0
  for (const [trimmed, variants] of [...byTrim.entries()].sort()) {
    const dirty = [...variants.keys()].some(v => v !== v.trim())
    if (!dirty && variants.size === 1) continue
    problem1++
    console.log(`\n  "${trimmed}" -> ${variants.size} varian dalam DB:`)
    for (const [v, rec] of variants) {
      console.log(`     ${raw(v)}  items=${rec.items} logs=${rec.logs}  reports=${[...rec.reports].join(', ') || '-'}`)
    }
  }
  if (!problem1) console.log('  (tiada)')

  // ---------------------------------------------------------------- 2
  head(2, 'LOG TransferIn YATIM (tiada TransferInItem sepadan) -- punca batch hilang senyap')
  const itemKeys = new Set(items.map(i => `${i.batchNo.trim()}|${i.mult}|${i.transferIn.doNumber.trim()}`))
  const orphans = logs.filter(
    l => l.type === 'TransferIn' && l.labelType && !itemKeys.has(`${l.batchNo.trim()}|${l.mult}|${l.labelType.trim()}`)
  )
  if (!orphans.length) console.log('  (tiada)')
  for (const l of orphans.sort((a, b) => +a.report.date - +b.report.date)) {
    console.log(
      `  ${toMalaysiaDateStr(l.report.date)} ${l.report.shift} ${l.report.status.padEnd(8)} rep=${l.reportId.slice(0, 8)} ` +
        `${l.sectionKey.padEnd(12)} ${raw(l.batchNo)} x${l.mult}  bags=${l.bags}  DO="${l.labelType}"`
    )
  }

  // ---------------------------------------------------------------- 3
  head(3, 'TransferInItem BERTINDIH (DO + batch + mult sama)')
  const dupMap = new Map<string, typeof items>()
  items.forEach(i => {
    const k = `${i.transferIn.doNumber.trim()}|${i.batchNo.trim()}|${i.mult}`
    if (!dupMap.has(k)) dupMap.set(k, [] as any)
    dupMap.get(k)!.push(i)
  })
  let problem3 = 0
  for (const [k, group] of dupMap) {
    if (group.length < 2) continue
    problem3++
    console.log(`\n  ${k}  -> ${group.length} item:`)
    group.forEach(i =>
      console.log(
        `     receive=${toMalaysiaDateStr(i.transferIn.receiveDate)} ${i.transferIn.shift ?? '-'}  cat=[${i.category}]  bags=${i.bags}  itemId=${i.id.slice(0, 8)}`
      )
    )
  }
  if (!problem3) console.log('  (tiada)')

  // ---------------------------------------------------------------- 4
  head(4, 'SHIFT DENGAN Storeroom + Usage SERENTAK -- usage dibuang oleh override')
  type Cell = { storeroom: number | null; usage: number; transferIn: number }
  const perReportBatch = new Map<string, Cell>()
  logs.forEach(l => {
    const k = `${l.reportId}|${l.sectionKey}|${l.batchNo.trim()}|${l.mult}`
    if (!perReportBatch.has(k)) perReportBatch.set(k, { storeroom: null, usage: 0, transferIn: 0 })
    const c = perReportBatch.get(k)!
    if (l.type === 'Storeroom') c.storeroom = (c.storeroom ?? 0) + l.bags
    else if (l.type === 'Usage' || l.type === 'Hold') c.usage += l.bags
    else if (l.type === 'Reuse') c.usage -= l.bags
    else if (l.type === 'TransferIn') c.transferIn += l.bags
  })
  const reportById = new Map(reports.map(r => [r.id, r]))
  const swallowed: { k: string; c: Cell }[] = []
  for (const [k, c] of perReportBatch) if (c.storeroom !== null && c.usage !== 0) swallowed.push({ k, c })
  swallowed.sort((a, b) => {
    const ra = reportById.get(a.k.split('|')[0])!, rb = reportById.get(b.k.split('|')[0])!
    return +ra.date - +rb.date
  })
  console.log(`  ${swallowed.length} kes dijumpai\n`)
  console.log(
    '  TARIKH      SH  REPORT   SECTION      BATCH                 STOREROOM  USAGE   SEKARANG  SEPATUTNYA'
  )
  for (const { k, c } of swallowed) {
    const [reportId, sectionKey, batchNo, mult] = k.split('|')
    const r = reportById.get(reportId)!
    const now = c.storeroom!
    const should = c.storeroom! + c.transferIn - c.usage
    console.log(
      `  ${toMalaysiaDateStr(r.date)}  ${(r.shift ?? '-').padEnd(2)}  ${reportId.slice(0, 8)} ${sectionKey.padEnd(12)} ` +
        `${(batchNo + ' x' + mult).padEnd(21)} ${String(c.storeroom).padStart(9)} ${String(c.usage).padStart(6)} ` +
        `${String(now).padStart(9)} ${String(should).padStart(11)}${now !== should ? '   <-- BEZA' : ''}`
    )
  }

  // ---------------------------------------------------------------- 5 & 6
  // Full replay per (category|batchNo|mult) bucket, exactly as getActiveInventory does.
  head(5, 'BATCH BERBAKI NEGATIF (di-clamp ke 0 -> hilang senyap dari dropdown)')

  const buckets = new Map<string, { category: string; batchNo: string; mult: number }>()
  items.forEach(i => buckets.set(`${i.category}|${i.batchNo}|${i.mult}`, { category: i.category, batchNo: i.batchNo, mult: i.mult }))

  type Row = { key: string; current: number; fixed: number; trace: string[] }
  const rows: Row[] = []

  for (const [key, b] of buckets) {
    const bDOs = items.filter(i => `${i.category}|${i.batchNo}|${i.mult}` === key)
    const bLogs = logs.filter(l => key.endsWith(`|${l.batchNo}|${l.mult}`))

    const ev: Record<number, { ti: number; st: number | null; us: number; tiLog: number }> = {}
    const at = (tp: number) => (ev[tp] ??= { ti: 0, st: null, us: 0, tiLog: 0 })
    bDOs.forEach(i => (at(getTimePoint(i.transferIn.receiveDate, i.transferIn.shift)).ti += i.bags))
    bLogs.forEach(l => {
      const e = at(getTimePoint(l.report.date, l.report.shift))
      if (l.type === 'Storeroom') e.st = (e.st ?? 0) + l.bags
      else if (l.type === 'Usage' || l.type === 'Hold') e.us += l.bags
      else if (l.type === 'Reuse') e.us -= l.bags
      else if (l.type === 'TransferIn') e.tiLog += l.bags
    })

    const tps = Object.keys(ev).map(Number).sort((a, b2) => a - b2)
    let current = 0
    let fixed = 0
    const trace: string[] = []
    for (const tp of tps) {
      const e = ev[tp]
      // current behaviour (getActiveInventory today)
      if (e.st !== null) current = e.st
      else current += e.ti - e.us
      // proposed behaviour: storeroom = opening balance for the shift, then inflow is added
      // and usage is ALWAYS subtracted. Inflow prefers the saved TransferIn log (immune to the
      // DO being edited later) and falls back to the live TransferInItem rows.
      if (e.st !== null) fixed = e.st
      fixed += Math.max(e.ti, e.tiLog)
      fixed -= e.us
      trace.push(
        `${tpLabel(tp)}  ti=${e.ti} tiLog=${e.tiLog} st=${e.st ?? '-'} us=${e.us}  ->  now=${current}  fixed=${fixed}`
      )
    }
    rows.push({ key, current, fixed, trace })
  }

  const negatives = rows.filter(r => r.current < 0)
  if (!negatives.length) console.log('  (tiada)')
  for (const r of negatives.sort((a, b) => a.current - b.current)) {
    console.log(`\n  [${r.key}]  baki=${r.current} -> DIPAPAR SEBAGAI 0 / HILANG`)
    r.trace.forEach(t => console.log(`     ${t}`))
  }

  head(6, 'PERBEZAAN: baki replay sekarang vs baki jika usage sentiasa ditolak')
  const diffs = rows.filter(r => Math.round(r.current) !== Math.round(r.fixed))
  console.log(`  ${diffs.length} daripada ${rows.length} bucket akan berubah\n`)
  console.log('  BUCKET                                              SEKARANG    SELEPAS BAIKI    BEZA')
  for (const r of diffs.sort((a, b) => Math.abs(b.current - b.fixed) - Math.abs(a.current - a.fixed))) {
    console.log(
      `  ${r.key.padEnd(50)} ${String(Math.round(r.current)).padStart(9)} ${String(Math.round(r.fixed)).padStart(15)} ${String(
        Math.round(r.fixed - r.current)
      ).padStart(9)}`
    )
  }

  console.log('\n(read-only: tiada data diubah)')
}

main()
  .catch(e => console.error('AUDIT FAILED:', e))
  .finally(() => prisma.$disconnect())
