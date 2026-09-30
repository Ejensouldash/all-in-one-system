const { Pool } = require('pg');
require('dotenv').config({ path: '.env', override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Adding department column to MaintenanceItem...');
  await pool.query(`
    ALTER TABLE "MaintenanceItem" 
    ADD COLUMN IF NOT EXISTS "department" TEXT DEFAULT 'BOS';
  `);
  
  // Set any existing nulls to BOS
  await pool.query(`
    UPDATE "MaintenanceItem" 
    SET "department" = 'BOS' 
    WHERE "department" IS NULL;
  `);

  console.log('Adding department column to MaintenanceStockLog (optional/auditing)...');
  await pool.query(`
    ALTER TABLE "MaintenanceStockLog" 
    ADD COLUMN IF NOT EXISTS "department" TEXT DEFAULT 'BOS';
  `);

  const res = await pool.query(`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'MaintenanceItem' AND column_name = 'department';
  `);
  console.log('Verification:', res.rows);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
