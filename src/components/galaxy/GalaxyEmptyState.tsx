import Link from "next/link";
import { Search } from "lucide-react";

export function GalaxyEmptyState() {
  return (
    <section className="flex min-h-[520px] flex-col items-center justify-center px-5 text-center">
      <div className="relative mb-8 h-28 w-56 text-aurora-cyan/50" aria-hidden>
        <span className="absolute left-4 top-16 size-2 rounded-full bg-current" />
        <span className="absolute left-16 top-8 size-3 rounded-full border border-current" />
        <span className="absolute left-28 top-14 size-2 rounded-full bg-current" />
        <span className="absolute right-12 top-5 size-2 rounded-full bg-current" />
        <span className="absolute right-4 top-20 size-3 rounded-full border border-current" />
        <span className="absolute left-6 top-14 h-px w-12 -rotate-[28deg] bg-current/50" />
        <span className="absolute left-[4.6rem] top-11 h-px w-14 rotate-[15deg] bg-current/50" />
        <span className="absolute right-[3.1rem] top-12 h-px w-20 -rotate-[27deg] bg-current/50" />
        <span className="absolute right-5 top-[4.1rem] h-px w-10 rotate-[43deg] bg-current/50" />
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-star">
        Your universe is empty
      </h1>
      <p className="mt-3 max-w-md text-stardust">
        Save a few tracks and we’ll chart the artists and genres that connect your listening world.
      </p>
      <Link
        href="/search"
        className="gradient-aurora mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-void"
      >
        <Search className="size-4" aria-hidden />
        Find music
      </Link>
    </section>
  );
}
