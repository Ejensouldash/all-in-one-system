import "server-only"

import { prisma } from "@/lib/prisma"

const normalise = (value: string) => value.trim().toUpperCase()

export async function getBatchTraceData(sku: string, batchNumber: string) {
  const cleanSku = sku.trim()
  const cleanBatch = normalise(batchNumber)

  const [batch, productionBatches, transfers, handovers, openingStocks, doItems, returns] = await Promise.all([
    prisma.inventoryBatch.findUnique({
      where: { sku_batchNumber: { sku: cleanSku, batchNumber: cleanBatch } }
    }),
    prisma.productionBatch.findMany({
      where: { batchNo: { equals: cleanBatch, mode: "insensitive" } },
      include: {
        productionOutput: {
          include: {
            report: { include: { createdBy: true } }
          }
        }
      },
      orderBy: { id: "asc" }
    }),
    prisma.productionTransfer.findMany({
      where: { sku: cleanSku, batchNumber: cleanBatch },
      include: {
        receivedBy: true,
        dailyReport: { include: { createdBy: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.handoverItem.findMany({
      where: { category: cleanSku, batchNo: { equals: cleanBatch, mode: "insensitive" } },
      include: {
        handover: {
          include: {
            productionStaff: true,
            warehouseStaff: true,
            dailyReport: { include: { createdBy: true } }
          }
        }
      },
      orderBy: { id: "asc" }
    }),
    prisma.warehouseOpeningStock.findMany({
      where: { sku: cleanSku, batchNumber: cleanBatch },
      include: { setBy: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.dOLineItem.findMany({
      where: { sku: cleanSku, batchNumber: cleanBatch },
      include: {
        distributionOrder: {
          include: {
            createdBy: true,
            trackingEvents: {
              include: { recordedBy: true },
              orderBy: { recordedAt: "asc" }
            }
          }
        }
      },
      orderBy: { distributionOrder: { distributionDate: "asc" } }
    }),
    prisma.goodsReturnNote.findMany({
      where: { sku: cleanSku, batchNumber: cleanBatch },
      include: { distributionOrder: true },
      orderBy: { loggedAt: "asc" }
    })
  ])

  if (!batch) return null

  const matchingProduction = productionBatches.filter(
    row => row.productionOutput.productType === cleanSku
  )

  const returnedQty = returns.reduce((sum, row) => sum + row.qtyReturned, 0)
  const quarantineQty = returns
    .filter(row => row.status === "QUARANTINE")
    .reduce((sum, row) => sum + row.qtyReturned, 0)

  return {
    batch,
    productionBatches: matchingProduction,
    transfers,
    handovers,
    openingStocks,
    doItems,
    returns,
    totals: { returnedQty, quarantineQty }
  }
}

export async function getDistributionTraceData(id: string) {
  return prisma.distributionOrder.findUnique({
    where: { id },
    include: {
      createdBy: true,
      items: true,
      returns: true,
      gatePassLinks: {
        include: {
          gatePass: {
            include: {
              items: true,
              statusEvents: {
                orderBy: { occurredAt: "asc" },
                include: { actorUser: true }
              },
              palletTransfers: {
                include: {
                  lines: { include: { palletType: true } }
                }
              },
              verificationTokens: {
                where: { revokedAt: null },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      },
      trackingEvents: {
        include: { recordedBy: true },
        orderBy: { recordedAt: "asc" }
      }
    }
  })
}
