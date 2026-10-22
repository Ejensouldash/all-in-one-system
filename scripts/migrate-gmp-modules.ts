import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("=== Starting GMP Module Access Migration ===")

  // Find all users who have any legacy maintenance modules
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { modules: { has: "MAINTENANCE_FORMS" } },
        { modules: { has: "MAINTENANCE_REPORTS" } },
        { modules: { has: "MAINTENANCE_SUMMARY" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      modules: true,
    },
  })

  console.log(`Found ${users.length} users with legacy maintenance modules.`)

  let updatedCount = 0

  for (const user of users) {
    const originalModules = [...user.modules]
    const updatedModules = originalModules.map(mod => {
      if (mod === "MAINTENANCE_FORMS") return "GMP_FORMS"
      if (mod === "MAINTENANCE_REPORTS") return "GMP_REPORTS"
      if (mod === "MAINTENANCE_SUMMARY") return "GMP_SUMMARY"
      return mod
    })

    // Deduplicate
    const finalModules = Array.from(new Set(updatedModules))

    console.log(`User: ${user.name || user.email} (${user.id})`)
    console.log(`  Before:`, originalModules)
    console.log(`  After: `, finalModules)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        modules: {
          set: finalModules,
        },
      },
    })

    updatedCount++
  }

  console.log(`\nMigration completed successfully! Total users updated: ${updatedCount}`)
}

main()
  .catch((e) => {
    console.error("Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
