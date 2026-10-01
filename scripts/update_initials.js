const { Pool } = require('pg');
require('dotenv').config({ path: '.env', override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateInitials() {
  try {
    const amRes = await pool.query('UPDATE "MaintenanceCleaning" SET "checkedBy" = \'AY\' WHERE shift = \'AM\'');
    console.log('Updated AM checkedBy to AY:', amRes.rowCount);

    const pmRes = await pool.query('UPDATE "MaintenanceCleaning" SET "checkedBy" = \'FH\' WHERE shift = \'PM\'');
    console.log('Updated PM checkedBy to FH:', pmRes.rowCount);

    const verRes = await pool.query('UPDATE "MaintenanceCleaning" SET "verifiedBy" = \'IZ\'');
    console.log('Updated verifiedBy to IZ:', verRes.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

updateInitials();
