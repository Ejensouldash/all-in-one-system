"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { 
  uploadMaintenancePhotoToR2, 
  uploadMaintenancePdfToR2 
} from "@/lib/maintenance-r2"
import { NrhoProjectStatus, NrhoTaskStatus } from "@prisma/client"

/**
 * Fetch all NRHO Projects with summary counts and financial metrics
 */
export async function getNrhoProjects() {
  try {
    const projects = await prisma.nrhoProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        _count: {
          select: {
            tasks: true,
            bqItems: true,
            blueprints: true,
            purchaseOrders: true,
            deliveryOrders: true,
            invoices: true,
          },
        },
        tasks: {
          select: { status: true },
        },
      },
    })

    const formatted = projects.map((p) => {
      const totalTasks = p.tasks.length
      const completedTasks = p.tasks.filter((t) => t.status === "COMPLETED").length
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        id: p.id,
        projectCode: p.projectCode,
        title: p.title,
        description: p.description,
        siteLocation: p.siteLocation,
        projectManager: p.projectManager,
        clientOrDepartment: p.clientOrDepartment,
        status: p.status,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        targetCompletionDate: p.targetCompletionDate ? p.targetCompletionDate.toISOString() : null,
        totalBqAmount: p.totalBqAmount,
        totalPoAmount: p.totalPoAmount,
        totalInvoicedAmount: p.totalInvoicedAmount,
        counts: p._count,
        progressPercent,
        createdAt: p.createdAt.toISOString(),
      }
    })

    return { success: true, data: formatted }
  } catch (err: any) {
    console.error("getNrhoProjects error:", err)
    return { success: false, error: err.message || "Failed to fetch NRHO projects." }
  }
}

/**
 * Fetch a single NRHO Project in full detail
 */
export async function getNrhoProjectById(id: string) {
  try {
    const project = await prisma.nrhoProject.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        bqItems: {
          orderBy: { orderIndex: "asc" },
        },
        tasks: {
          orderBy: [{ currentWeek: "asc" }, { createdAt: "asc" }],
          include: {
            rescheduleLogs: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        blueprints: {
          orderBy: { createdAt: "desc" },
        },
        purchaseOrders: {
          orderBy: { issueDate: "desc" },
        },
        deliveryOrders: {
          orderBy: { receivedDate: "desc" },
        },
        invoices: {
          orderBy: { invoiceDate: "desc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!project) {
      return { success: false, error: "Project not found." }
    }

    return { success: true, data: project }
  } catch (err: any) {
    console.error("getNrhoProjectById error:", err)
    return { success: false, error: err.message || "Failed to fetch project details." }
  }
}

/**
 * Create a new NRHO Project with unique auto-incrementing Project Code
 */
export async function createNrhoProject(formData: FormData) {
  const session = await auth()
  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const siteLocation = (formData.get("siteLocation") as string)?.trim() || null
  const projectManager = (formData.get("projectManager") as string)?.trim() || null
  const clientOrDepartment = (formData.get("clientOrDepartment") as string)?.trim() || "NRHO Division"
  const startDateStr = formData.get("startDate") as string
  const targetCompletionDateStr = formData.get("targetCompletionDate") as string

  if (!title) {
    return { success: false, error: "Project Title is required." }
  }

  try {
    const year = new Date().getFullYear()
    const countThisYear = await prisma.nrhoProject.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
        },
      },
    })

    const projectCode = `NRHO-${year}-${String(countThisYear + 1).padStart(3, "0")}`

    const project = await prisma.nrhoProject.create({
      data: {
        projectCode,
        title,
        description,
        siteLocation,
        projectManager,
        clientOrDepartment,
        status: NrhoProjectStatus.DRAFT,
        startDate: startDateStr ? new Date(startDateStr) : null,
        targetCompletionDate: targetCompletionDateStr ? new Date(targetCompletionDateStr) : null,
        createdById: session?.user?.id || null,
        auditLogs: {
          create: {
            action: "PROJECT_CREATED",
            details: `Project registered in Quotation / DRAFT phase (${projectCode}).`,
            actorName: session?.user?.name || "NRHO Staff",
          },
        },
      },
    })

    revalidatePath("/nrho-project")
    return { success: true, projectId: project.id, projectCode }
  } catch (err: any) {
    console.error("createNrhoProject error:", err)
    return { success: false, error: err.message || "Failed to create project." }
  }
}

/**
 * Update Project Basic Info
 */
export async function updateNrhoProject(id: string, formData: FormData) {
  const session = await auth()
  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const siteLocation = (formData.get("siteLocation") as string)?.trim() || null
  const projectManager = (formData.get("projectManager") as string)?.trim() || null
  const clientOrDepartment = (formData.get("clientOrDepartment") as string)?.trim() || null
  const status = formData.get("status") as NrhoProjectStatus | null
  const startDateStr = formData.get("startDate") as string
  const targetCompletionDateStr = formData.get("targetCompletionDate") as string

  try {
    await prisma.nrhoProject.update({
      where: { id },
      data: {
        title: title || undefined,
        description,
        siteLocation,
        projectManager,
        clientOrDepartment,
        status: status || undefined,
        startDate: startDateStr ? new Date(startDateStr) : undefined,
        targetCompletionDate: targetCompletionDateStr ? new Date(targetCompletionDateStr) : undefined,
        auditLogs: {
          create: {
            action: "PROJECT_UPDATED",
            details: "Project details updated.",
            actorName: session?.user?.name || "User",
          },
        },
      },
    })

    revalidatePath(`/nrho-project/${id}`)
    revalidatePath("/nrho-project")
    return { success: true }
  } catch (err: any) {
    console.error("updateNrhoProject error:", err)
    return { success: false, error: err.message || "Failed to update project." }
  }
}

/**
 * SUBMIT PROJECT FOR BOSS APPROVAL ("Present to Boss")
 */
export async function submitNrhoProjectForApproval(id: string) {
  const session = await auth()
  try {
    const project = await prisma.nrhoProject.findUnique({
      where: { id },
      include: { bqItems: true },
    })

    if (!project) return { success: false, error: "Project not found." }

    if (project.bqItems.length === 0) {
      return { 
        success: false, 
        error: "Please add at least one Bill of Quantities (BQ) item before submitting for Boss Approval." 
      }
    }

    await prisma.nrhoProject.update({
      where: { id },
      data: {
        status: NrhoProjectStatus.PENDING_APPROVAL,
        auditLogs: {
          create: {
            action: "SUBMITTED_FOR_APPROVAL",
            details: `Project proposal submitted for Boss / Management review with ${project.bqItems.length} BQ items (Total: RM ${project.totalBqAmount.toFixed(2)}).`,
            actorName: session?.user?.name || "Project Leader",
          },
        },
      },
    })

    revalidatePath(`/nrho-project/${id}`)
    revalidatePath("/nrho-project")
    return { success: true }
  } catch (err: any) {
    console.error("submitNrhoProjectForApproval error:", err)
    return { success: false, error: err.message || "Failed to submit project proposal." }
  }
}

/**
 * BOSS APPROVES OR REJECTS PROJECT PROPOSAL
 */
export async function reviewNrhoProjectApproval(
  id: string,
  decision: "APPROVE" | "REJECT",
  remarks?: string
) {
  const session = await auth()
  try {
    const newStatus = decision === "APPROVE" ? NrhoProjectStatus.APPROVED : NrhoProjectStatus.DRAFT

    await prisma.nrhoProject.update({
      where: { id },
      data: {
        status: newStatus,
        approvalRemarks: remarks || null,
        approvedAt: decision === "APPROVE" ? new Date() : null,
        approvedById: decision === "APPROVE" ? session?.user?.id || null : null,
        auditLogs: {
          create: {
            action: decision === "APPROVE" ? "BOSS_APPROVED" : "BOSS_REJECTED",
            details: decision === "APPROVE"
              ? `Project approved by management. Remarks: "${remarks || 'Approved without additional notes.'}"`
              : `Project returned for revision. Reason/Remarks: "${remarks || 'Revisions required.'}"`,
            actorName: session?.user?.name || "Management",
          },
        },
      },
    })

    revalidatePath(`/nrho-project/${id}`)
    revalidatePath("/nrho-project")
    return { success: true }
  } catch (err: any) {
    console.error("reviewNrhoProjectApproval error:", err)
    return { success: false, error: err.message || "Failed to record management decision." }
  }
}

/**
 * SAVE OR UPDATE BQ LINE ITEMS
 */
export async function saveNrhoBqItems(
  projectId: string,
  items: Array<{
    category: string
    description: string
    quantity: number | string
    unit: string
    unitRate: number | string
    amount: number | string
  }>
) {
  const session = await auth()
  try {
    const sanitizedItems = items.map((item, index) => {
      const quantity = Math.max(0, parseFloat(String(item.quantity)) || 0)
      const unitRate = Math.max(0, parseFloat(String(item.unitRate)) || 0)
      const amount = Math.round(quantity * unitRate * 100) / 100
      return {
        projectId,
        category: item.category || "GENERAL",
        description: item.description?.trim() || "",
        quantity,
        unit: item.unit || "UNIT",
        unitRate,
        amount,
        orderIndex: index + 1,
      }
    })

    const totalAmount = sanitizedItems.reduce((sum, item) => sum + item.amount, 0)

    await prisma.$transaction(async (tx) => {
      // Delete existing BQ items
      await tx.nrhoProjectBqItem.deleteMany({
        where: { projectId },
      })

      // Insert new items
      if (sanitizedItems.length > 0) {
        await tx.nrhoProjectBqItem.createMany({
          data: sanitizedItems,
        })
      }

      // Update total BQ in project
      await tx.nrhoProject.update({
        where: { id: projectId },
        data: {
          totalBqAmount: totalAmount,
        },
      })

      // Record audit log
      await tx.nrhoProjectAuditLog.create({
        data: {
          projectId,
          action: "BQ_UPDATED",
          details: `Bill of Quantities (BQ) updated with ${sanitizedItems.length} line items. Total estimate: RM ${totalAmount.toFixed(2)}.`,
          actorName: session?.user?.name || "User",
        },
      })
    })

    revalidatePath(`/nrho-project/${projectId}`)
    revalidatePath("/nrho-project")
    return { success: true }
  } catch (err: any) {
    console.error("saveNrhoBqItems error:", err)
    return { success: false, error: err.message || "Failed to save BQ items." }
  }
}

/**
 * CREATE A TASK IN A PROJECT TIMELINE WEEK
 */
export async function createNrhoTask(
  projectId: string,
  weekNumber: number,
  taskName: string,
  description?: string,
  assignedTo?: string
) {
  const session = await auth()
  if (!taskName?.trim()) {
    return { success: false, error: "Task Name is required." }
  }

  try {
    const taskWeek = Math.max(1, Number(weekNumber) || 1)

    const task = await prisma.nrhoProjectTask.create({
      data: {
        projectId,
        taskName: taskName.trim(),
        description: description?.trim() || null,
        assignedTo: assignedTo?.trim() || null,
        plannedWeek: taskWeek,
        currentWeek: taskWeek,
        status: NrhoTaskStatus.PENDING,
        progressPercent: 0,
      },
    })

    await prisma.nrhoProjectAuditLog.create({
      data: {
        projectId,
        action: "TASK_CREATED",
        details: `Task added to Week ${taskWeek}: "${taskName.trim()}".`,
        actorName: session?.user?.name || "User",
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true, task }
  } catch (err: any) {
    console.error("createNrhoTask error:", err)
    return { success: false, error: err.message || "Failed to create task." }
  }
}

/**
 * UPDATE TASK STATUS OR PROGRESS PERCENTAGE
 */
export async function updateNrhoTaskStatus(
  taskId: string,
  projectId: string,
  status: NrhoTaskStatus,
  progressPercent: number
) {
  try {
    await prisma.nrhoProjectTask.update({
      where: { id: taskId },
      data: {
        status,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    console.error("updateNrhoTaskStatus error:", err)
    return { success: false, error: err.message || "Failed to update task status." }
  }
}

/**
 * RESCHEDULE TASK TO ANOTHER WEEK (With Mandatory Justification Reason)
 */
export async function rescheduleNrhoTask(
  taskId: string,
  projectId: string,
  newWeek: number,
  reason: string
) {
  const session = await auth()
  const cleanReason = reason?.trim()
  if (!cleanReason) {
    return { success: false, error: "Delay justification reason is mandatory." }
  }

  const targetWeek = Number(newWeek)
  if (isNaN(targetWeek) || targetWeek < 1) {
    return { success: false, error: "Invalid target week." }
  }

  try {
    const task = await prisma.nrhoProjectTask.findUnique({
      where: { id: taskId },
    })

    if (!task) return { success: false, error: "Task not found." }

    const oldWeek = task.currentWeek

    await prisma.$transaction(async (tx) => {
      // 1. Record immutable reschedule log
      await tx.nrhoProjectTaskRescheduleLog.create({
        data: {
          taskId,
          fromWeek: oldWeek,
          toWeek: targetWeek,
          reason: cleanReason,
          recordedBy: session?.user?.name || "Project Staff",
        },
      })

      // 2. Update task's active week
      await tx.nrhoProjectTask.update({
        where: { id: taskId },
        data: {
          currentWeek: targetWeek,
          status: targetWeek > oldWeek && task.status !== "COMPLETED" ? NrhoTaskStatus.DELAYED : task.status,
        },
      })

      // 3. Project Audit Log
      await tx.nrhoProjectAuditLog.create({
        data: {
          projectId,
          action: "TASK_RESCHEDULED",
          details: `Task "${task.taskName}" rescheduled from Week ${oldWeek} to Week ${targetWeek}. Justification: "${cleanReason}".`,
          actorName: session?.user?.name || "User",
        },
      })
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    console.error("rescheduleNrhoTask error:", err)
    return { success: false, error: err.message || "Failed to update reschedule." }
  }
}

/**
 * UPLOAD FLOOR PLAN / BLUEPRINT / DRAWING
 */
export async function uploadNrhoBlueprint(projectId: string, formData: FormData) {
  const session = await auth()
  const title = (formData.get("title") as string)?.trim() || "Site Layout Drawing"
  const file = formData.get("file") as File | null

  if (!file) {
    return { success: false, error: "Floor plan or blueprint file is required." }
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let fileUrl: string
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf")
    const isImage = file.type.startsWith("image/")

    if (isPdf) {
      try {
        const upload = await uploadMaintenancePdfToR2(buffer, file.name)
        fileUrl = upload.url
      } catch (r2Err) {
        console.warn("R2 PDF upload fallback:", r2Err)
        fileUrl = `data:application/pdf;base64,${buffer.toString("base64")}`
      }
    } else {
      try {
        const upload = await uploadMaintenancePhotoToR2(buffer, file.name, file.type || "image/jpeg")
        fileUrl = upload.url
      } catch (r2Err) {
        console.warn("R2 Image upload fallback:", r2Err)
        fileUrl = `data:${file.type || 'image/jpeg'};base64,${buffer.toString("base64")}`
      }
    }

    const blueprint = await prisma.nrhoProjectBlueprint.create({
      data: {
        projectId,
        title,
        fileUrl,
        fileType: isPdf ? "PDF" : isImage ? "IMAGE" : "CAD",
        fileSize: file.size,
        uploadedBy: session?.user?.name || "User",
      },
    })

    await prisma.nrhoProjectAuditLog.create({
      data: {
        projectId,
        action: "BLUEPRINT_UPLOADED",
        details: `Floor plan / blueprint uploaded: "${title}".`,
        actorName: session?.user?.name || "User",
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true, blueprint }
  } catch (err: any) {
    console.error("uploadNrhoBlueprint error:", err)
    return { success: false, error: err.message || "Failed to upload blueprint." }
  }
}

/**
 * DELETE BLUEPRINT
 */
export async function deleteNrhoBlueprint(blueprintId: string, projectId: string) {
  try {
    await prisma.nrhoProjectBlueprint.delete({
      where: { id: blueprintId },
    })
    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete blueprint." }
  }
}

/**
 * CREATE PURCHASE ORDER (PO)
 */
export async function createNrhoPO(projectId: string, formData: FormData) {
  const session = await auth()
  const poNumber = (formData.get("poNumber") as string)?.trim()
  const vendorName = (formData.get("vendorName") as string)?.trim()
  const amount = parseFloat(formData.get("amount") as string) || 0
  const notes = (formData.get("notes") as string)?.trim() || null

  if (!poNumber || !vendorName || amount <= 0) {
    return { success: false, error: "Please enter PO Number, Vendor Name, and Amount (RM)." }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.nrhoProjectPO.create({
        data: {
          projectId,
          poNumber,
          vendorName,
          amount,
          status: "ISSUED",
          notes,
        },
      })

      // Recalculate total PO amount
      const allPos = await tx.nrhoProjectPO.findMany({ where: { projectId } })
      const sumPo = allPos.reduce((sum, p) => sum + p.amount, 0)

      await tx.nrhoProject.update({
        where: { id: projectId },
        data: { totalPoAmount: sumPo },
      })

      await tx.nrhoProjectAuditLog.create({
        data: {
          projectId,
          action: "PO_CREATED",
          details: `Purchase Order (PO) issued: ${poNumber} - ${vendorName} (RM ${amount.toFixed(2)}).`,
          actorName: session?.user?.name || "User",
        },
      })
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    console.error("createNrhoPO error:", err)
    return { success: false, error: err.message || "Failed to create PO." }
  }
}

/**
 * CREATE DELIVERY ORDER (DO)
 */
export async function createNrhoDO(projectId: string, formData: FormData) {
  const session = await auth()
  const doNumber = (formData.get("doNumber") as string)?.trim()
  const vendorName = (formData.get("vendorName") as string)?.trim()
  const receivedBy = (formData.get("receivedBy") as string)?.trim() || session?.user?.name || "Site Staff"
  const itemsSummary = (formData.get("itemsSummary") as string)?.trim() || null
  const notes = (formData.get("notes") as string)?.trim() || null

  if (!doNumber || !vendorName) {
    return { success: false, error: "Please enter DO Number and Vendor Name." }
  }

  try {
    await prisma.nrhoProjectDO.create({
      data: {
        projectId,
        doNumber,
        vendorName,
        receivedBy,
        itemsSummary,
        notes,
      },
    })

    await prisma.nrhoProjectAuditLog.create({
      data: {
        projectId,
        action: "DO_RECORDED",
        details: `Delivery Order (DO) recorded: ${doNumber} received by ${receivedBy}.`,
        actorName: session?.user?.name || "User",
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    console.error("createNrhoDO error:", err)
    return { success: false, error: err.message || "Failed to record DO." }
  }
}

/**
 * CREATE INVOICE
 */
export async function createNrhoInvoice(projectId: string, formData: FormData) {
  const session = await auth()
  const invoiceNumber = (formData.get("invoiceNumber") as string)?.trim()
  const vendorName = (formData.get("vendorName") as string)?.trim()
  const amount = parseFloat(formData.get("amount") as string) || 0
  const dueDateStr = formData.get("dueDate") as string
  const notes = (formData.get("notes") as string)?.trim() || null

  if (!invoiceNumber || !vendorName || amount <= 0) {
    return { success: false, error: "Please enter Invoice Number, Vendor Name, and Amount (RM)." }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.nrhoProjectInvoice.create({
        data: {
          projectId,
          invoiceNumber,
          vendorName,
          amount,
          status: "UNPAID",
          dueDate: dueDateStr ? new Date(dueDateStr) : null,
          notes,
        },
      })

      // Recalculate total Invoiced amount
      const allInvoices = await tx.nrhoProjectInvoice.findMany({ where: { projectId } })
      const sumInvoiced = allInvoices.reduce((sum, inv) => sum + inv.amount, 0)

      await tx.nrhoProject.update({
        where: { id: projectId },
        data: { totalInvoicedAmount: sumInvoiced },
      })

      await tx.nrhoProjectAuditLog.create({
        data: {
          projectId,
          action: "INVOICE_RECORDED",
          details: `Invoice recorded: ${invoiceNumber} - ${vendorName} (RM ${amount.toFixed(2)}).`,
          actorName: session?.user?.name || "User",
        },
      })
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    console.error("createNrhoInvoice error:", err)
    return { success: false, error: err.message || "Failed to record invoice." }
  }
}

/**
 * UPDATE INVOICE STATUS (Mark as Paid or Unpaid)
 */
export async function updateNrhoInvoiceStatus(
  invoiceId: string, 
  projectId: string, 
  status: "UNPAID" | "PAID"
) {
  const session = await auth()
  try {
    await prisma.nrhoProjectInvoice.update({
      where: { id: invoiceId },
      data: { status },
    })

    await prisma.nrhoProjectAuditLog.create({
      data: {
        projectId,
        action: "INVOICE_STATUS_UPDATED",
        details: `Invoice status updated to ${status}.`,
        actorName: session?.user?.name || "User",
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update invoice status." }
  }
}

/**
 * CROSS-PROJECT QUERIES FOR DEDICATED SIDEBAR SUB-PAGES
 */

export async function getAllNrhoBqOverview() {
  try {
    const projects = await prisma.nrhoProject.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectCode: true,
        title: true,
        siteLocation: true,
        status: true,
        totalBqAmount: true,
        bqItems: {
          orderBy: { orderIndex: "asc" },
        },
      },
    })
    return { success: true, data: projects }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch BQ overview." }
  }
}

export async function getAllNrhoTimelineOverview() {
  try {
    const projects = await prisma.nrhoProject.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectCode: true,
        title: true,
        siteLocation: true,
        status: true,
        startDate: true,
        targetCompletionDate: true,
        tasks: {
          orderBy: [{ currentWeek: "asc" }, { createdAt: "asc" }],
          include: {
            rescheduleLogs: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    })
    return { success: true, data: projects }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch timeline overview." }
  }
}

export async function getAllNrhoFinancialOverview() {
  try {
    const projects = await prisma.nrhoProject.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectCode: true,
        title: true,
        siteLocation: true,
        status: true,
        totalBqAmount: true,
        totalPoAmount: true,
        totalInvoicedAmount: true,
        purchaseOrders: { orderBy: { issueDate: "desc" } },
        deliveryOrders: { orderBy: { receivedDate: "desc" } },
        invoices: { orderBy: { invoiceDate: "desc" } },
      },
    })
    return { success: true, data: projects }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch financial overview." }
  }
}

export async function getAllNrhoBlueprintsOverview() {
  try {
    const blueprints = await prisma.nrhoProjectBlueprint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            title: true,
            siteLocation: true,
          },
        },
      },
    })
    return { success: true, data: blueprints }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch blueprints." }
  }
}

export async function getAllNrhoApprovalsOverview() {
  try {
    const projects = await prisma.nrhoProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        bqItems: { select: { id: true, amount: true } },
        auditLogs: {
          where: {
            action: { in: ["SUBMITTED_FOR_APPROVAL", "BOSS_APPROVED", "BOSS_REJECTED"] },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
    return { success: true, data: projects }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch approvals." }
  }
}
