"use client";

import Image from "next/image";
import { Music, Pause, Play, X } from "lucide-react";
import { usePlayerStore } from "@/stores/player";

export function PlayerBar() {
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);
  const stop = usePlayerStore((s) => s.stop);

  if (!current) return null;

  return (
    <div className="glass fixed inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-lg px-4 py-3 md:left-[15.5rem]">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-space-3">
        {current.albumImageUrl ? (
          <Image
            src={current.albumImageUrl}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-faint">
            <Music className="size-4" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-star">{current.title}</p>
        <p className="truncate text-xs text-stardust">{current.artistName}</p>
      </div>

      <button
        type="button"
        onClick={() => toggle(current)}
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
        className="gradient-aurora flex size-9 items-center justify-center rounded-full text-void"
      >
        {isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 fill-current" />
        )}
      </button>

      <button
        type="button"
        onClick={stop}
        aria-label="Close player"
        className="flex size-8 items-center justify-center rounded-full text-stardust transition-colors hover:bg-space-3 hover:text-star"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
