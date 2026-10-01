const { Pool } = require('pg');
require('dotenv').config({ path: '.env', override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  try {
    const count = await pool.query('SELECT count(*) FROM "MaintenanceCleaning"');
    console.log('Total records in MaintenanceCleaning:', count.rows[0].count);

    const sep2026MeetingChanging = await pool.query(`
      SELECT count(*) FROM "MaintenanceCleaning"
      WHERE section = 'meeting-changing'
        AND date >= '2026-09-01' AND date <= '2026-09-30 23:59:59'
    `);
    console.log('September 2026 Meeting Changing records:', sep2026MeetingChanging.rows[0].count);

    const sample = await pool.query(`
      SELECT date, shift, section, "floorOk", "platformOk", "trashOk", "mirrorOk", "ceilingOk", "floorCleaner", "platformCleaner", "checkedBy"
      FROM "MaintenanceCleaning"
      WHERE section = 'meeting-changing'
        AND date >= '2026-09-01' AND date <= '2026-09-03'
      ORDER BY date ASC, shift ASC
    `);
    console.log('Sample rows for Sept 1-3 2026:', sample.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

verify();
