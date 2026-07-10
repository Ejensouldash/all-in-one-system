require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const crypto = require('crypto');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();

  const email = 'viewonly@bubbleso2.com';
  const hashedPassword = await bcrypt.hash('viewonly123', 10);
  
  // Check if exists
  const res = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
  
  if (res.rows.length === 0) {
    const id = crypto.randomUUID();
    await client.query(
      'INSERT INTO "User" (id, name, email, password, role, modules, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [id, 'CEO (View Only)', email, hashedPassword, 'SUPERADMIN', ['FORMS', 'WAREHOUSE', 'TICKETS']]
    );
    console.log('View Only account created successfully! Email: viewonly@bubbleso2.com | Password: viewonly123');
  } else {
    await client.query(
      'UPDATE "User" SET password = $1, role = $2 WHERE email = $3',
      [hashedPassword, 'SUPERADMIN', email]
    );
    console.log('View Only account updated successfully! Email: viewonly@bubbleso2.com | Password: viewonly123');
  }
  
  await client.end();
}

main().catch(console.error);
