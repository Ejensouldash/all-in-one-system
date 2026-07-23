export default function AssetsListLoading() {
  return (
    <div className="space-y-6 pb-10 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded-md w-56 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-md w-80"></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg w-full"></div>
        ))}
      </div>
    </div>
  )
}
