export default function MaintenanceSummaryLoading() {
  return (
    <div className="bg-gray-50 pb-16 min-h-screen animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex items-center space-x-4 mb-2">
          <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
          <div className="h-7 bg-gray-200 rounded-md w-64"></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-96"></div>
      </div>
    </div>
  )
}
