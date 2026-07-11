import Link from "next/link";
import { ArrowUpRight, ListMusic } from "lucide-react";
import type { PlaylistSummaryDTO } from "@/lib/dto";

export function PlaylistCard({ playlist }: { playlist: PlaylistSummaryDTO }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="group flex items-start gap-4 border-b border-border py-5 transition-colors hover:text-star"
    >
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-space-2 text-aurora-violet transition-colors group-hover:bg-space-3 group-hover:text-aurora-cyan">
        <ListMusic className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-medium text-star">
          {playlist.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm leading-6 text-stardust">
          {playlist.vibeDescription}
        </span>
        <span className="mt-2 block font-mono text-[11px] text-faint">
          {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"} ·{" "}
          {new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
          }).format(new Date(playlist.createdAt))}
        </span>
      </span>
      <ArrowUpRight
        className="mt-1 size-4 shrink-0 text-faint transition-colors group-hover:text-aurora-cyan"
        aria-hidden
      />
    </Link>
  );
}
