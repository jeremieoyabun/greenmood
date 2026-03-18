export default function KBLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-white/[0.05] rounded mb-2" />
      <div className="h-4 w-64 bg-white/[0.03] rounded mb-6" />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-20 bg-white/[0.035] border border-white/[0.08] rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-white/[0.035] border border-white/[0.08] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
