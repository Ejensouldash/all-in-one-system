import { prisma } from "../src/lib/prisma"

async function main() {
  const lockKey = `warehouse-lock-smoke:${Date.now()}`
  const affectedRows = await prisma.$transaction(async tx => {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`
  })
  console.log(JSON.stringify({ passed: true, affectedRows }, null, 2))
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
