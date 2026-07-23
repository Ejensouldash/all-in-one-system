export default function AssetDetailLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse space-y-6">
      <div className="h-7 bg-gray-200 rounded-md w-64 mb-2"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm h-72"></div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-72"></div>
      </div>
    </div>
  )
}
