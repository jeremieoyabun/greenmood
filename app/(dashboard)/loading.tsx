export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-white/[0.05] rounded mb-2" />
      <div className="h-4 w-56 bg-white/[0.03] rounded mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-white/[0.035] border border-white/[0.08] rounded-xl p-5">
            <div className="h-3 w-20 bg-white/[0.05] rounded mb-3" />
            <div className="h-7 w-12 bg-white/[0.05] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-48 bg-white/[0.035] border border-white/[0.08] rounded-xl" />
        <div className="h-48 bg-white/[0.035] border border-white/[0.08] rounded-xl" />
      </div>
    </div>
  )
}
