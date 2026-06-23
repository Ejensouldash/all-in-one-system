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

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
