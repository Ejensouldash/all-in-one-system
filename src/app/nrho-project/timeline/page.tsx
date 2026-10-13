import Link from "next/link"
import { getAllNrhoTimelineOverview } from "@/app/actions/nrho-project"
import { 
  CalendarDays, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  ExternalLink, 
  Plus 
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Work Planning & Timeline | NRHO Project",
  description: "Cross-project weekly lookahead schedules and task reschedule justification records.",
}

export default async function NrhoTimelineOverviewPage() {
  const res = await getAllNrhoTimelineOverview()
  const projects = res.success && res.data ? res.data : []

  const totalTasksAll = projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)
  const completedTasksAll = projects.reduce(
    (sum, p) => sum + (p.tasks?.filter((t: any) => t.status === "COMPLETED").length || 0),
    0
  )
  const delayedTasksAll = projects.reduce(
    (sum, p) => sum + (p.tasks?.filter((t: any) => t.status === "DELAYED").length || 0),
    0
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/nrho-project"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to NRHO Projects Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Master Work Planning &amp; Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Weekly Planning &amp; Timeline Lookahead
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Consolidated weekly task schedules across projects. If any task is delayed beyond its target week, mandatory justification reasons are logged to ensure strict operational accountability.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 flex items-center gap-6 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Tasks</span>
            <span className="text-2xl font-black font-mono text-slate-900">{totalTasksAll}</span>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Completed</span>
            <span className="text-2xl font-black font-mono text-emerald-700">{completedTasksAll}</span>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Rescheduled</span>
            <span className="text-2xl font-black font-mono text-amber-700">{delayedTasksAll}</span>
          </div>
        </div>
      </div>

      {/* Projects Timeline Schedule */}
      <div className="space-y-6">
        {projects.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Project Timelines Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Register a project to begin structuring weekly tasks and milestone tracking.
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Project Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {project.projectCode}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                  </div>
                  {project.siteLocation && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{project.siteLocation}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-slate-500">
                    <span className="font-mono text-emerald-700 font-bold">
                      {project.tasks.filter((t: any) => t.status === "COMPLETED").length} of {project.tasks.length}
                    </span> tasks completed
                  </div>

                  <Link
                    href={`/nrho-project/${project.id}?tab=timeline`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                  >
                    <span>Manage Timeline</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Weekly Tasks Preview */}
              <div className="p-4 space-y-3">
                {project.tasks.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No timeline tasks configured yet for this project.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {project.tasks.slice(0, 6).map((task: any) => (
                      <div
                        key={task.id}
                        className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                              Week {task.currentWeek}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              task.status === "COMPLETED" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : task.status === "DELAYED" 
                                ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{task.taskName}</h4>
                          {task.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{task.description}</p>
                          )}
                        </div>

                        {task.rescheduleLogs && task.rescheduleLogs.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 text-[10px] text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate">Rescheduled: {task.rescheduleLogs[0].reason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {project.tasks.length > 6 && (
                  <div className="pt-2 text-center">
                    <Link
                      href={`/nrho-project/${project.id}?tab=timeline`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      View all {project.tasks.length} timeline tasks →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
