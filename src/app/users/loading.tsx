export default function UsersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-6 bg-gray-200 rounded-md w-56 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md w-80"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-64"></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg w-full"></div>
        ))}
      </div>
    </div>
  )
}
