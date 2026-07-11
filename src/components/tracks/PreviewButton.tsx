"use client";

import { Pause, Play } from "lucide-react";
import { usePlayerStore, type PlayerTrack } from "@/stores/player";
import { cn } from "@/lib/utils";

export function PreviewButton({ track }: { track: PlayerTrack }) {
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);

  const isCurrent = current?.id === track.id;
  const playing = isCurrent && isPlaying;

  return (
    <button
      type="button"
      onClick={() => toggle(track)}
      aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-void/55 text-star transition-opacity",
        playing
          ? "opacity-100"
          : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100",
      )}
    >
      {playing ? (
        <Pause className="size-5 fill-current" />
      ) : (
        <Play className="size-5 fill-current" />
      )}
    </button>
  );
}
