export function GalaxySkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading your music galaxy" role="status">
      <div className="space-y-3">
        <div className="h-9 w-52 animate-pulse rounded-md bg-space-3 motion-reduce:animate-none" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-space-2 motion-reduce:animate-none" />
      </div>
      <div className="h-[min(68dvh,720px)] min-h-[480px] animate-pulse rounded-lg bg-space-1 motion-reduce:animate-none" />
      <span className="sr-only">Loading your saved artists and their connections.</span>
    </div>
  );
}
