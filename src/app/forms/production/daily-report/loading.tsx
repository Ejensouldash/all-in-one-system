export default function DailyReportFormLoading() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 animate-pulse space-y-6">
      <div className="h-7 bg-gray-200 rounded-md w-64 mb-2"></div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg w-full"></div>
        ))}
      </div>
    </div>
  )
}
