export default function CalendarLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-white/[0.05] rounded mb-2" />
      <div className="h-4 w-64 bg-white/[0.03] rounded mb-6" />
      <div className="grid grid-cols-7 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 bg-gm-dark/50 p-2">
            <div className="h-3 w-4 bg-white/[0.05] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
