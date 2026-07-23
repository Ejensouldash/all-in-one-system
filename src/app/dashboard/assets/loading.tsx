export default function AssetsDashboardLoading() {
  return (
    <div className="space-y-8 pb-10 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-7 bg-gray-200 rounded-md w-56 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md w-80"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-28">
            <div className="h-3 bg-gray-200 rounded w-20 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm h-[400px]"></div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[400px]"></div>
      </div>
    </div>
  )
}
