const { Pool } = require('pg');
require('dotenv').config({ path: '.env', override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query(`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'MaintenanceItem'
  `);
  console.log('Columns in MaintenanceItem:', res.rows);
  await pool.end();
}

main().catch(console.error);
