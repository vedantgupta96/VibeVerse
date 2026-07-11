export function TasteSkeleton() {
  return (
    <div
      className="animate-pulse motion-reduce:animate-none"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading Taste DNA</span>
      <div className="grid items-center gap-10 border-b border-border pb-12 lg:grid-cols-[22rem_1fr]">
        <div className="mx-auto aspect-square w-full max-w-80 rounded-full bg-space-2" />
        <div>
          <div className="h-10 w-3/5 rounded-md bg-space-2" />
          <div className="mt-6 h-4 w-full rounded bg-space-2" />
          <div className="mt-3 h-4 w-5/6 rounded bg-space-2" />
          <div className="mt-3 h-4 w-2/3 rounded bg-space-2" />
          <div className="mt-7 flex gap-2"><div className="h-9 w-28 rounded-full bg-space-2" /><div className="h-9 w-36 rounded-full bg-space-2" /></div>
        </div>
      </div>
      <div className="grid gap-12 py-12 lg:grid-cols-2">
        {[0, 1].map((section) => <div key={section}><div className="h-7 w-40 rounded bg-space-2" /><div className="mt-7 space-y-5">{[0, 1, 2, 3].map((row) => <div key={row} className="h-8 rounded bg-space-2" />)}</div></div>)}
      </div>
    </div>
  );
}
