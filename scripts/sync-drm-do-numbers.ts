import { prisma } from "../src/lib/prisma"
import { normaliseReportDoNumber } from "../src/lib/warehouse/rawMaterialService"

async function main() {
  console.log("=== Memulakan penyelarasan nombor DO Daily Raw Material ===")

  const reports = await prisma.warehouseRawMaterialReport.findMany({
    where: {
      referenceDoNumber: { not: null },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Dijumpai ${reports.length} rekod laporan dengan referenceDoNumber.`)

  let updatedCount = 0

  for (const report of reports) {
    const rawRef = report.referenceDoNumber
    const targetDo = normaliseReportDoNumber(rawRef)

    if (!targetDo) {
      console.log(`Laporan ${report.id} (${report.date.toISOString().split("T")[0]} #${report.sequence}): referenceDoNumber kosong/tidak sah (${rawRef})`)
      continue
    }

    const currentLinked = report.linkedDoNumber

    if (currentLinked === targetDo && report.referenceDoNumber === targetDo) {
      console.log(`Laporan ${report.id}: sudah selaras (${targetDo})`)
      continue
    }

    console.log(
      `Menyelaraskan Laporan ${report.id} (${report.date.toISOString().split("T")[0]} #${report.sequence}): ` +
      `Lama=[linked: ${currentLinked}, ref: ${rawRef}] -> Baru=[${targetDo}]`
    )

    await prisma.$transaction(async tx => {
      // If there was an old linked DO in TransferIn, update it
      if (currentLinked) {
        const transferIns = await tx.transferIn.findMany({
          where: { doNumber: currentLinked },
        })
        if (transferIns.length > 0) {
          console.log(`  - Mengemas kini ${transferIns.length} rekod TransferIn (${currentLinked} -> ${targetDo})`)
          await tx.transferIn.updateMany({
            where: { doNumber: currentLinked },
            data: { doNumber: targetDo },
          })
        }

        // Update any inventory logs pointing to old linked DO
        const invLogs = await tx.inventoryLog.findMany({
          where: { type: "TransferIn", labelType: currentLinked },
        })
        if (invLogs.length > 0) {
          console.log(`  - Mengemas kini ${invLogs.length} rekod InventoryLog (${currentLinked} -> ${targetDo})`)
          await tx.inventoryLog.updateMany({
            where: { type: "TransferIn", labelType: currentLinked },
            data: { labelType: targetDo },
          })
        }
      }

      // Update the report itself
      await tx.warehouseRawMaterialReport.update({
        where: { id: report.id },
        data: {
          linkedDoNumber: currentLinked ? targetDo : null,
          referenceDoNumber: targetDo,
        },
      })
    })

    updatedCount++
  }

  console.log(`=== Selesai! Sebanyak ${updatedCount} laporan telah diselaraskan. ===`)
}

main()
  .catch(e => {
    console.error("Ralat semasa menyelaraskan DO:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
