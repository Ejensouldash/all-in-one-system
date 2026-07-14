import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: "Qayyum" } },
    select: { id: true, name: true, role: true, modules: true, branch: { select: { name: true } } }
  })
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
