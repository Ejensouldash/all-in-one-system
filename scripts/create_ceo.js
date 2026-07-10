require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const crypto = require('crypto');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();

  const email = 'ceo@bubbleo2.com';
  const hashedPassword = await bcrypt.hash('ceo123', 10);
  
  // Check if exists
  const res = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
  
  if (res.rows.length === 0) {
    const id = crypto.randomUUID();
    await client.query(
      'INSERT INTO "User" (id, name, email, password, role, modules, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [id, 'CEO', email, hashedPassword, 'SUPERADMIN', ['FORMS', 'WAREHOUSE', 'TICKETS']]
    );
    console.log('CEO account created successfully! Email: ceo@bubbleo2.com | Password: ceo123');
  } else {
    await client.query(
      'UPDATE "User" SET password = $1, role = $2 WHERE email = $3',
      [hashedPassword, 'SUPERADMIN', email]
    );
    console.log('CEO account updated successfully! Email: ceo@bubbleo2.com | Password: ceo123');
  }
  
  await client.end();
}

main().catch(console.error);
