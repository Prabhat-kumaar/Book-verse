function Shine({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}

export function BookCardSkeleton({ className = '' }) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${className}`}>
      <Shine className="h-52 w-full" />
      <Shine className="mt-3 h-4 w-4/5" />
      <Shine className="mt-2 h-3 w-2/3" />
      <Shine className="mt-2 h-3 w-1/2" />
      <Shine className="mt-3 h-9 w-full" />
    </article>
  )
}

export function ProgressCardSkeleton() {
  return (
    <article className="min-w-[230px] max-w-[230px] rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <Shine className="h-32 w-full" />
      <Shine className="mt-3 h-4 w-5/6" />
      <Shine className="mt-2 h-3 w-2/3" />
      <Shine className="mt-2 h-3 w-1/2" />
      <Shine className="mt-2 h-2 w-full" />
      <Shine className="mt-3 h-9 w-full" />
    </article>
  )
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <BookCardSkeleton key={`grid-skeleton-${i}`} />
      ))}
    </div>
  )
}

export function NavbarSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center gap-3">
        <Shine className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shine className="h-3 w-36" />
          <Shine className="h-4 w-28" />
        </div>
        <Shine className="h-10 w-24 rounded-xl" />
      </div>
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 sm:p-8">
      <Shine className="h-5 w-28" />
      <Shine className="mt-4 h-10 w-3/4 sm:h-12" />
      <Shine className="mt-3 h-4 w-full" />
      <Shine className="mt-2 h-4 w-5/6" />
      <div className="mt-5 flex gap-3">
        <Shine className="h-10 w-32 rounded-xl" />
        <Shine className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  )
}

export function ReaderSkeleton() {
  return (
    <div className="h-full w-full rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-8">
      <Shine className="h-3 w-44" />
      <Shine className="mt-4 h-[72vh] w-full rounded-2xl" />
    </div>
  )
}
