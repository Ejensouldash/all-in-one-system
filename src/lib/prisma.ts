import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from "@prisma/client"
import dotenv from 'dotenv'

// Force load from .env file to prevent shell environment variable conflicts
dotenv.config({ path: '.env', override: true })

let connectionString = process.env.DATABASE_URL || ""
if (!connectionString.includes("pgbouncer=true") && connectionString.includes("pooler.supabase.com")) {
  connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true"
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({ 
    connectionString, 
    max: 2, // Vercel functions scale horizontally, so keep per-instance pool very small
    idleTimeoutMillis: 3000, // Aggressively close idle connections in serverless
    connectionTimeoutMillis: 5000 
  })
  const adapter = new PrismaPg(pool)
  prisma = new PrismaClient({ adapter })
} else {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ 
      connectionString, 
      max: 5, // Limit connections in dev
      idleTimeoutMillis: 10000, 
      connectionTimeoutMillis: 5000 
    })
    const adapter = new PrismaPg(pool)
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
