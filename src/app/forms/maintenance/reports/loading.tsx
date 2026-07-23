export default function MaintenanceReportsLoading() {
  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24 animate-pulse">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-7 bg-gray-200 rounded-md w-64 mb-2"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm h-32"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
