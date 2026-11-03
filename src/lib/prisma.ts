import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from "@prisma/client"
import dotenv from 'dotenv'

// Force load from .env file to prevent shell environment variable conflicts
dotenv.config({ path: '.env', override: true })

let connectionString = process.env.DATABASE_URL || ""

// In serverless environments, we must use the Supabase Transaction Pooler (port 6543)
// instead of the Session Pooler (port 5432) to prevent EMAXCONNSSESSION errors.
if (connectionString.includes("pooler.supabase.com")) {
  connectionString = connectionString.replace(":5432/", ":6543/")
  
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true"
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    if (!globalForPrisma.prisma) {
      const pool = new Pool({ 
        connectionString, 
        max: 2, // Vercel functions scale horizontally, so keep per-instance pool very small
        idleTimeoutMillis: 3000, // Aggressively close idle connections in serverless
        connectionTimeoutMillis: 5000 
      })
      const adapter = new PrismaPg(pool)
      globalForPrisma.prisma = new PrismaClient({ adapter })
    }
    return globalForPrisma.prisma
  } else {
    if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).marketingVideoDesignRequisition) {
      const pool = new Pool({ 
        connectionString, 
        max: 5, // Limit connections in dev
        idleTimeoutMillis: 10000, 
        connectionTimeoutMillis: 5000 
      })
      const adapter = new PrismaPg(pool)
      globalForPrisma.prisma = new PrismaClient({ adapter })
    }
    return globalForPrisma.prisma
  }
}

// Dynamic proxy so any access evaluates the latest PrismaClient with all model delegates
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  }
})

export { prisma }
