"use client"

import { useState } from "react"
import { 
  createNrhoTask, 
  updateNrhoTaskStatus, 
  rescheduleNrhoTask 
} from "@/app/actions/nrho-project"
import { 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  ChevronRight, 
  History, 
  ArrowRight,
  User, 
  Layers, 
  X,
  Sparkles,
  CalendarDays
} from "lucide-react"

const DELAY_PRESETS = [
  "Adverse Weather Conditions / Heavy Rain on Site",
  "Supply Chain / Material Delivery Delay by Vendor",
  "Client Variation Order / Specification Revision",
  "Shortage of Specialized / Skilled Labor on Site",
  "Structural Quality Inspection & Rectification",
  "Permit & Local Authority Regulatory Clearance",
]

export function ProjectTimelineTab({
  projectId,
  tasks = [],
}: {
  projectId: string
  tasks: any[]
}) {
  const [taskList, setTaskList] = useState<any[]>(tasks)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Reschedule Modal State
  const [rescheduleTask, setRescheduleTask] = useState<any | null>(null)
  const [targetWeek, setTargetWeek] = useState<number>(1)
  const [delayReason, setDelayReason] = useState<string>("")

  // Add Task Modal State
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false)
  const [newTaskWeek, setNewTaskWeek] = useState<number>(1)
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskDesc, setNewTaskDesc] = useState("")
  const [newTaskAssigned, setNewTaskAssigned] = useState("")

  // Calculate unique weeks (1 through max week, minimum 4 weeks)
  const maxWeekInTasks = taskList.reduce((max, t) => Math.max(max, t.currentWeek || 1), 4)
  const weekNumbers = Array.from({ length: Math.max(maxWeekInTasks, 4) }, (_, i) => i + 1)

  // Open reschedule modal
  const handleOpenReschedule = (task: any) => {
    setRescheduleTask(task)
    setTargetWeek((task.currentWeek || 1) + 1)
    setDelayReason("")
    setStatusMsg(null)
  }

  // Submit Reschedule (MANDATORY REASON)
  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!delayReason.trim()) {
      setStatusMsg({ type: "error", text: "Delay justification reason is mandatory." })
      return
    }

    setIsProcessing(true)
    setStatusMsg(null)

    const res = await rescheduleNrhoTask(
      rescheduleTask.id,
      projectId,
      targetWeek,
      delayReason.trim()
    )

    setIsProcessing(false)

    if (res.success) {
      setRescheduleTask(null)
      setStatusMsg({
        type: "success",
        text: `Task successfully rescheduled to Week ${targetWeek}! Reason logged in audit trail.`,
      })
      setTimeout(() => window.location.reload(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to reschedule task." })
    }
  }

  // Submit New Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim()) {
      setStatusMsg({ type: "error", text: "Please enter a task name." })
      return
    }

    setIsProcessing(true)
    setStatusMsg(null)

    const res = await createNrhoTask(
      projectId,
      newTaskWeek,
      newTaskName.trim(),
      newTaskDesc.trim(),
      newTaskAssigned.trim()
    )

    setIsProcessing(false)

    if (res.success && res.task) {
      setTaskList([...taskList, res.task])
      setShowAddTaskModal(false)
      setNewTaskName("")
      setNewTaskDesc("")
      setNewTaskAssigned("")
      setStatusMsg({ type: "success", text: `Task added to Week ${newTaskWeek}!` })
      setTimeout(() => window.location.reload(), 800)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to create task." })
    }
  }

  // Update Status / Progress Quick Toggle
  const handleQuickStatusChange = async (task: any, newStatus: string) => {
    setIsProcessing(true)
    const progress = newStatus === "COMPLETED" ? 100 : newStatus === "IN_PROGRESS" ? 50 : 0
    const res = await updateNrhoTaskStatus(task.id, projectId, newStatus as any, progress)
    setIsProcessing(false)

    if (res.success) {
      setTaskList(
        taskList.map((t) => (t.id === task.id ? { ...t, status: newStatus, progressPercent: progress } : t))
      )
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to update task status." })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Weekly Work Planning &amp; Milestone Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Manage weekly tasks. If a task cannot be completed within its designated week, it can be rescheduled to a future week with a <strong>mandatory justification reason</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setNewTaskWeek(1)
            setShowAddTaskModal(true)
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Weekly Task</span>
        </button>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Weekly Schedule Columns */}
      <div className="space-y-6">
        {weekNumbers.map((weekNo) => {
          const weekTasks = taskList.filter((t) => (t.currentWeek || 1) === weekNo)
          const completedCount = weekTasks.filter((t) => t.status === "COMPLETED").length
          const delayedCount = weekTasks.filter((t) => t.status === "DELAYED").length

          return (
            <div
              key={weekNo}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Week Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black uppercase tracking-wider bg-blue-600 text-white px-3 py-1 rounded-lg shadow-sm">
                    Week {weekNo}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-medium">{weekTasks.length} Task{weekTasks.length === 1 ? "" : "s"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-semibold">{completedCount} Completed</span>
                    {delayedCount > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-amber-700 font-semibold">{delayedCount} Rescheduled</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNewTaskWeek(weekNo)
                    setShowAddTaskModal(true)
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Week {weekNo}</span>
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-4">
                {weekTasks.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No tasks assigned to Week {weekNo} yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weekTasks.map((task) => {
                      const isCompleted = task.status === "COMPLETED"
                      const isDelayed = task.status === "DELAYED"
                      const hasRescheduleLogs = task.rescheduleLogs && task.rescheduleLogs.length > 0

                      return (
                        <div
                          key={task.id}
                          className="bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">
                                {task.taskName}
                              </span>

                              {isCompleted && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completed
                                </span>
                              )}

                              {isDelayed && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Rescheduled
                                </span>
                              )}

                              {task.plannedWeek && task.plannedWeek !== task.currentWeek && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  (Originally Week {task.plannedWeek})
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                              {task.assignedTo && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <User className="w-3 h-3 text-blue-600" />
                                  PIC: {task.assignedTo}
                                </span>
                              )}

                              {hasRescheduleLogs && (
                                <span className="flex items-center gap-1 text-amber-700 font-medium">
                                  <History className="w-3 h-3" />
                                  {task.rescheduleLogs.length} Reschedule Record{task.rescheduleLogs.length === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>

                            {/* Reschedule Reasons History snippet */}
                            {hasRescheduleLogs && (
                              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block">
                                  Latest Delay Justification:
                                </span>
                                <p className="italic">
                                  &ldquo;{task.rescheduleLogs[0]?.reason}&rdquo;
                                </p>
                                <span className="text-[10px] text-slate-500 block">
                                  Moved from Week {task.rescheduleLogs[0]?.fromWeek} to Week {task.rescheduleLogs[0]?.toWeek} by {task.rescheduleLogs[0]?.recordedBy}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={task.status}
                              onChange={(e) => handleQuickStatusChange(task, e.target.value)}
                              className="bg-white border border-slate-300 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DELAYED">Delayed</option>
                              <option value="COMPLETED">Completed</option>
                            </select>

                            <button
                              onClick={() => handleOpenReschedule(task)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                              title="Reschedule to another week with reason"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Reschedule Week</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* RESCHEDULE MODAL (MANDATORY REASON) */}
      {rescheduleTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setRescheduleTask(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Mandatory Delay Justification</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Reschedule Task: &ldquo;{rescheduleTask.taskName}&rdquo;
              </h3>
              <p className="text-xs text-slate-500">
                Current Week: <span className="font-mono text-slate-700 font-bold">Week {rescheduleTask.currentWeek}</span>. Moving this task to another week requires a documented justification for management audit records.
              </p>
            </div>

            <form onSubmit={handleSubmitReschedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Destination Week <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono font-medium"
                >
                  {Array.from({ length: Math.max(weekNumbers.length + 3, 8) }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w} disabled={w === rescheduleTask.currentWeek}>
                      Week {w} {w === rescheduleTask.currentWeek ? "(Current Week)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Justifications */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Quick Delay Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DELAY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDelayReason(preset)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-50 border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-800 transition-colors text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Textarea (MANDATORY) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detailed Justification Reason <span className="text-rose-500">* (Mandatory)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="Explain why the task could not be completed within the current week and what mitigation measures are taken..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !delayReason.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  <span>Save Reschedule Justification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAddTaskModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Add Task to Week {newTaskWeek}
              </h3>
              <p className="text-xs text-slate-500">
                Define the work item and assign responsibility for this project milestone.
              </p>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Week
                </label>
                <select
                  value={newTaskWeek}
                  onChange={(e) => setNewTaskWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono font-medium"
                >
                  {Array.from({ length: Math.max(weekNumbers.length + 2, 6) }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Task Name / Work Item <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Demolition & Debris Clearance"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Assigned PIC / Contractor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mega Civil Subcontractor"
                  value={newTaskAssigned}
                  onChange={(e) => setNewTaskAssigned(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Scope &amp; Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional technical details..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !newTaskName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
