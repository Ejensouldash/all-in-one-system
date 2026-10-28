export function WarehouseSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-36 rounded-2xl bg-slate-200" />
      <div className="h-9 w-72 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 rounded-2xl bg-slate-100" />)}
      </div>
      <div className="h-56 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-80 rounded-2xl bg-slate-100" />)}
      </div>
    </div>
  )
}
