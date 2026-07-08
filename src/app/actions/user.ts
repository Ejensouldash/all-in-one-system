"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function createUser(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as any
  const branchId = formData.get("branchId") as string
  const unitId = formData.get("unitId") as string
  const googleEmail = formData.get("googleEmail") as string
  const plainPassword = formData.get("password") as string || "P@ssword123"

  if (!name || !email) return { success: false, error: "Name and email are required" }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return { success: false, error: "Email already exists in the system" }

    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "STAFF",
        branchId: branchId || null,
        unitId: unitId || null,
        googleEmail: googleEmail || null
      }
    })
    
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteUser(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }
  if (session.user.id === id) return { success: false, error: "You cannot delete your own active session account." }

  try {
    // STRICT Option A: Prevent deletion if linked data exists
    const linkedTickets = await prisma.ticket.count({ where: { createdById: id } })

    if (linkedTickets > 0) {
      return { success: false, error: `Cannot delete user. They have ${linkedTickets} tickets linked to their account.` }
    }

    await prisma.user.delete({ where: { id } })
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as any
  const branchId = formData.get("branchId") as string
  const unitId = formData.get("unitId") as string
  const googleEmail = formData.get("googleEmail") as string

  if (!name || !email) return { success: false, error: "Name and email are required" }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== id) return { success: false, error: "Email already exists in the system" }

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role: role || "STAFF",
        branchId: branchId || null,
        unitId: unitId || null,
        googleEmail: googleEmail || null
      }
    })
    
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function resetUserPassword(id: string, formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const newPassword = formData.get("newPassword") as string
  if (!newPassword || newPassword.length < 6) return { success: false, error: "Password must be at least 6 characters" }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    })
    
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUserModules(id: string, modules: string[]) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    await prisma.user.update({
      where: { id },
      data: { modules: { set: modules } }
    })
    
    revalidatePath("/users")
    revalidatePath(`/users/${id}/access`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
