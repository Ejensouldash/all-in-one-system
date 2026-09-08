import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { suggestGroups } from '../src/lib/reminders/pm-import.ts'
import { datesBetween } from '../src/lib/reminders/pm-core.ts'
import { lockPM, materializePM } from '../src/lib/reminders/pm-store.ts'

dotenv.config({ path: '.env', override: true })

let connectionString = process.env.DATABASE_URL || ''
if (connectionString.includes('pooler.supabase.com')) {
  connectionString = connectionString.replace(':5432/', ':6543/')
  if (!connectionString.includes('pgbouncer=true')) {
    connectionString += connectionString.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true'
  }
}

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  console.log('--- 1. Fetching Existing Import Record ---')
  const imp = await prisma.reminderPMImport.findUnique({
    where: { id: '6d980c6e-ba44-4957-9b65-3098df18673d' }
  })
  if (!imp) {
    throw new Error('Import record 6d980c6e-ba44-4957-9b65-3098df18673d not found')
  }

  const rows = imp.rows
  console.log(`Found import: ${imp.fileName} with ${rows.length} rows.`)

  const groups = suggestGroups(rows)
  console.log(`Groups suggested: ${groups.length}\n`)

  let total2026Occurrences = 0
  let totalRowsAccounted = 0

  groups.forEach((g, idx) => {
    const dates2026 = datesBetween(g, '2026-09-08', '2026-12-31')
    total2026Occurrences += dates2026.length
    totalRowsAccounted += g.sourceRows.length
    console.log(`[Group ${idx + 1}]`)
    console.log(`  Equipment   : ${g.equipment}`)
    console.log(`  SRS         : ${g.srs || '(None)'}`)
    console.log(`  Frequency   : Every ${g.intervalCount} ${g.intervalUnit}(s)`)
    console.log(`  Start Date  : ${g.startDate}`)
    console.log(`  Checklist (${g.checklist.length}): ${g.checklist.join(' | ')}`)
    console.log(`  Excel PICs  : ${[...new Set(g.sourceRows.map(r => r.pic))].join(', ')}`)
    console.log(`  Source Rows : ${g.sourceRows.length} rows`)
    console.log(`  2026 Dates  : ${dates2026.length} occurrences -> ${dates2026.join(', ')}\n`)
  })

  console.log('=== SUMMARY OF EXCEL ANALYSIS ===')
  console.log(`Total Source Rows : ${totalRowsAccounted} (expected 161)`)
  console.log(`Total Groups      : ${groups.length} (expected 17)`)
  console.log(`Total Remaining Occurrences in 2026: ${total2026Occurrences}`)

  if (totalRowsAccounted !== 161 || groups.length !== 17) {
    throw new Error('Analysis mismatch! Expected 161 rows across 17 groups.')
  }

  // Find user Muhammad Iskandar Zulkarnain Bin Zulkifli or fallback to any superadmin
  const superadmin = (await prisma.user.findFirst({
    where: {
      role: 'SUPERADMIN',
      email: 'iskandar23113@gmail.com'
    }
  })) || (await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' }
  }))

  console.log(`\nUsing Superadmin: ${superadmin.name} (${superadmin.email}, id: ${superadmin.id})`)

  // Seeding into Database
  console.log('\n--- 2. Seeding Schedules and Occurrences into Database ---')
  const activationDate = '2026-09-08'

  await prisma.$transaction(async (tx) => {
    await lockPM(tx)

    // Mark groups reviewed and set picIds to [] (as requested by user)
    const reviewedGroups = groups.map(g => ({
      ...g,
      picIds: [], // Empty as user will assign them later
      reviewed: true
    }))

    for (let index = 0; index < reviewedGroups.length; index++) {
      const group = reviewedGroups[index]
      const scheduleInput = {
        equipment: group.equipment.trim(),
        srs: group.srs?.trim() || null,
        checklist: [...new Set(group.checklist.map(t => t.trim()))],
        picIds: [],
        startDate: group.startDate,
        intervalUnit: group.intervalUnit,
        intervalCount: group.intervalCount,
      }

      const existingSchedule = await tx.reminderPMSchedule.findUnique({
        where: { sourceKey: group.sourceKey }
      })

      if (existingSchedule) {
        console.log(`Updating existing schedule ${existingSchedule.id} for ${group.equipment}...`)
        await tx.reminderPMSchedule.update({
          where: { id: existingSchedule.id },
          data: {
            ...scheduleInput,
            importId: imp.id,
            sourceRows: JSON.parse(JSON.stringify(group.sourceRows))
          }
        })
      } else {
        console.log(`Creating schedule ${index + 1}/${reviewedGroups.length}: ${group.equipment} (${group.srs || 'No SRS'})...`)
        await tx.reminderPMSchedule.create({
          data: {
            ...scheduleInput,
            sourceKey: group.sourceKey,
            importId: imp.id,
            sourceRows: JSON.parse(JSON.stringify(group.sourceRows)),
            activationDate,
            generationFrom: activationDate,
            createdById: superadmin.id
          }
        })
      }
    }

    // Materialize occurrences through 2026-12-31
    console.log('Materializing occurrences through 2026-12-31...')
    await materializePM(tx, '2026-12-31')

    // Mark import confirmed
    await tx.reminderPMImport.update({
      where: { id: imp.id },
      data: {
        confirmedAt: new Date(),
        review: JSON.parse(JSON.stringify(reviewedGroups))
      }
    })
  }, { timeout: 60000 })

  console.log('\n--- 3. Verifying Database State ---')
  const schedCount = await prisma.reminderPMSchedule.count()
  const occCount = await prisma.reminderPMOccurrence.count()
  const occsTodayOrUpcoming = await prisma.reminderPMOccurrence.count({
    where: { dueDate: { gte: activationDate, lte: '2026-12-31' } }
  })

  console.log(`Total Schedules in DB: ${schedCount}`)
  console.log(`Total Occurrences in DB: ${occCount}`)
  console.log(`Occurrences in 2026 (from ${activationDate}): ${occsTodayOrUpcoming}`)

  console.log('\nSUCCESS: All 17 schedules and occurrences seeded cleanly!')
}

run()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('ERROR in seed script:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
