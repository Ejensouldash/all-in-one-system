"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const password = formData.get("password") as string

  try {
    const updateData: any = {}
    if (name) updateData.name = name
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateGlobalSettings(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const companyName = formData.get("COMPANY_NAME") as string
  const supportEmail = formData.get("SUPPORT_EMAIL") as string

  try {
    const upsertSetting = async (key: string, value: string) => {
      if (value) {
        await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      }
    }

    await upsertSetting("COMPANY_NAME", companyName)
    await upsertSetting("SUPPORT_EMAIL", supportEmail)

    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function generateBackup() {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    const [settings, branches, units, users, assets, tickets] = await Promise.all([
      prisma.setting.findMany(),
      prisma.branch.findMany(),
      prisma.unit.findMany(),
      prisma.user.findMany(),
      prisma.asset.findMany(),
      prisma.ticket.findMany()
    ])

    const backupData = {
      settings, branches, units, users, assets, tickets
    }

    return { success: true, data: JSON.stringify(backupData, null, 2) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restoreBackup(jsonString: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    const data = JSON.parse(jsonString)

    // Execute in an interactive transaction to ensure complete rollback on failure
    await prisma.$transaction(async (tx) => {
      // 1. DELETE ALL EXISTING DATA IN CORRECT RELATIONAL ORDER
      await tx.ticket.deleteMany()
      await tx.asset.deleteMany()
      await tx.user.deleteMany()
      await tx.unit.deleteMany()
      await tx.branch.deleteMany()
      await tx.setting.deleteMany()

      // 2. INSERT NEW DATA IN CORRECT RELATIONAL ORDER
      if (data.settings?.length) await tx.setting.createMany({ data: data.settings })
      if (data.branches?.length) await tx.branch.createMany({ data: data.branches })
      if (data.units?.length) await tx.unit.createMany({ data: data.units })
      if (data.users?.length) await tx.user.createMany({ data: data.users })
      if (data.assets?.length) await tx.asset.createMany({ data: data.assets })
      if (data.tickets?.length) await tx.ticket.createMany({ data: data.tickets })
    }, {
      timeout: 20000 // Increase timeout for large data restores
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
