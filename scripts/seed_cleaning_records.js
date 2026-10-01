const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: '.env', override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SECTIONS = [
  { id: 'meeting-changing', lines: [null] },
  { id: 'filtration-uv', lines: [null] },
  { id: 'labelling', lines: ['Line 1', 'Line 2'] },
  { id: 'raw-material', lines: ['Line 1', 'Line 2'] },
  { id: 'packing', lines: ['Line 1', 'Line 2'] },
  { id: 'machine-3in1', lines: ['Line 1', 'Line 2'] },
  { id: 'finishing', lines: ['Line 1', 'Line 2'] },
  { id: 'blower-buffer', lines: ['Line 1', 'Line 2'] },
  { id: 'auto-scrambler', lines: ['Line 1', 'Line 2'] }
];

const TARGET_YEARS = [2026, 2025];
const TARGET_MONTHS = [
  { monthNum: 7, days: 31, name: 'July' },
  { monthNum: 8, days: 31, name: 'August' },
  { monthNum: 9, days: 30, name: 'September' }
];

const SAMPLE_SIGNATURE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='40'><path d='M10 25 Q 30 10, 50 25 T 90 20' stroke='black' stroke-width='2' fill='none'/></svg>";

async function seed() {
  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('Starting seed transaction...');
    await client.query('BEGIN');

    // 1. Delete existing records for Jul, Aug, Sep in 2025 and 2026
    for (const year of TARGET_YEARS) {
      for (const m of TARGET_MONTHS) {
        const start = new Date(Date.UTC(year, m.monthNum - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, m.monthNum, 0, 23, 59, 59, 999));
        const delRes = await client.query(
          'DELETE FROM "MaintenanceCleaning" WHERE date >= $1 AND date <= $2',
          [start, end]
        );
        console.log(`Cleared ${delRes.rowCount} existing records for ${m.name} ${year}`);
      }
    }

    const rowsToInsert = [];

    for (const year of TARGET_YEARS) {
      for (const m of TARGET_MONTHS) {
        for (let day = 1; day <= m.days; day++) {
          const dateObj = new Date(Date.UTC(year, m.monthNum - 1, day, 12, 0, 0));
          const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
          const isMonthEnd = (day === m.days);

          // Weekdays (Mon-Fri) + month-end clean:
          const isOperatingDay = !isWeekend || isMonthEnd;

          if (!isOperatingDay) {
            continue;
          }

          const is3xWeeklyDay = (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) || isMonthEnd;

          const shifts = [
            { shift: 'AM', staff: 'AY' },
            { shift: 'PM', staff: 'FH' }
          ];

          for (const s of SECTIONS) {
            for (const line of s.lines) {
              for (const sh of shifts) {
                const id = crypto.randomUUID();

                let floorOk = true;
                let floorCleaner = 'Alkaline';

                let platformOk = false;
                let platformCleaner = null;

                let trashOk = false;
                let trashCleaner = null;

                let mirrorOk = false;
                let mirrorCleaner = null;

                let ceilingOk = false;
                let ceilingCleaner = null;

                let machineOk = false;
                let machineCleaner = null;

                let shutterOk = false;
                let shutterCleaner = null;

                switch (s.id) {
                  case 'meeting-changing':
                    platformOk = true;
                    platformCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      mirrorOk = true;
                      mirrorCleaner = 'Glass Cleaner';
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'filtration-uv':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    if (is3xWeeklyDay) {
                      mirrorOk = true;
                      mirrorCleaner = 'Glass Cleaner';
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'labelling':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'raw-material':
                    if (is3xWeeklyDay) {
                      ceilingOk = true;
                      ceilingCleaner = '-';
                      shutterOk = true;
                      shutterCleaner = '-';
                    }
                    break;

                  case 'packing':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      mirrorOk = true;
                      mirrorCleaner = 'Glass Cleaner';
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'machine-3in1':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      mirrorOk = true;
                      mirrorCleaner = 'Glass Cleaner';
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'finishing':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      mirrorOk = true;
                      mirrorCleaner = 'Glass Cleaner';
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'blower-buffer':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;

                  case 'auto-scrambler':
                    machineOk = true;
                    machineCleaner = 'Disinfectant';
                    trashOk = true;
                    trashCleaner = '-';
                    if (is3xWeeklyDay) {
                      ceilingOk = true;
                      ceilingCleaner = '-';
                    }
                    break;
                }

                rowsToInsert.push([
                  id,
                  dateObj,
                  sh.shift,
                  s.id,
                  line,
                  floorOk,
                  platformOk,
                  trashOk,
                  mirrorOk,
                  ceilingOk,
                  machineOk,
                  shutterOk,
                  floorCleaner,
                  platformCleaner,
                  trashCleaner,
                  mirrorCleaner,
                  ceilingCleaner,
                  machineCleaner,
                  shutterCleaner,
                  sh.staff,
                  'IZ',
                  SAMPLE_SIGNATURE,
                  SAMPLE_SIGNATURE,
                  new Date(),
                  new Date()
                ]);
              }
            }
          }
        }
      }
    }

    console.log(`Generated ${rowsToInsert.length} rows to insert. Executing in batches of 100...`);

    const BATCH_SIZE = 100;

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const valueClauses = [];
      const params = [];

      batch.forEach((row, rowIdx) => {
        const placeholders = [];
        row.forEach((val) => {
          params.push(val);
          placeholders.push(`$${params.length}`);
        });
        valueClauses.push(`(${placeholders.join(', ')})`);
      });

      const queryText = `
        INSERT INTO "MaintenanceCleaning" (
          id, date, shift, section, line,
          "floorOk", "platformOk", "trashOk", "mirrorOk", "ceilingOk", "machineOk", "shutterOk",
          "floorCleaner", "platformCleaner", "trashCleaner", "mirrorCleaner", "ceilingCleaner", "machineCleaner", "shutterCleaner",
          "checkedBy", "verifiedBy", "performedSignature", "verifiedSignature",
          "createdAt", "updatedAt"
        ) VALUES ${valueClauses.join(', ')}
      `;

      await client.query(queryText, params);
      process.stdout.write(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rowsToInsert.length / BATCH_SIZE)}\r`);
    }

    await client.query('COMMIT');
    console.log(`\nSUCCESS! Batch-inserted ${rowsToInsert.length} records into PostgreSQL!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed transaction failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
